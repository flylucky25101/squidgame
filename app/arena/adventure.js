export const replacementRound = (r) => [1, 3, 5].includes(r);
export const STORAGE = [
  { x: -8, z: 12, w: 8, d: 4 },
  { x: 8, z: 4, w: 8, d: 4 },
  { x: -8, z: -6, w: 8, d: 4 },
  { x: 8, z: -17, w: 8, d: 4 },
];
export const CELLS = [
  { x: -12, z: 4 },
  { x: 12, z: -8 },
  { x: -12, z: -21 },
];
export const GAPS = [
  { a: 18, b: 21 },
  { a: 42, b: 45 },
  { a: 69, b: 72 },
];
export const PRESSES = [29, 54, 81];
export const ROADBLOCKS = Array.from({ length: 22 }, (_, i) => ({
  z: 45 + i * 24,
  x: [-5, 0, 5, 0, 5, -5][i % 6],
  w: i % 4 === 0 ? 3.4 : 2.5,
}));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function createChallenge(round) {
  const base = {
    x: 0,
    z: 24,
    y: 0,
    heading: Math.PI,
    speed: 0,
    hurt: 0,
    health: 100,
    travel: 0,
  };
  if (round === 1)
    return {
      ...base,
      kind: 'blackout',
      flash: true,
      cells: [],
      charge: 100,
      hunters: [
        { x: -12, z: -12, alert: 0 },
        { x: 12, z: -27, alert: 0 },
      ],
      sprinting: false,
    };
  if (round === 3)
    return {
      ...base,
      kind: 'factory',
      x: 0,
      z: 0,
      jump: 0,
      vy: 0,
      hang: false,
      hangTime: 0,
      checkpoint: 0,
      collapses: [],
      grabbed: false,
    };
  if (round === 5)
    return {
      ...base,
      kind: 'chase',
      x: 0,
      z: 0,
      velocity: 0,
      fuel: 100,
      boost: 0,
      pursuit: 28,
      hit: new Set(),
      route: 0,
    };
  return null;
}
function end(s, win, message, kind = 'fall') {
  s.status = win ? 'won' : 'dying';
  s.message = message;
  s.deathKind = kind;
  s.deathTime = 0;
  s.speed = 0;
  if (!win && kind === 'shot') s.shotId++;
}
export function challengeAction(s, action) {
  if (s.status !== 'playing') return;
  const c = s.challenge;
  if (!c) return;
  if (c.kind === 'blackout' && action === 'primary') {
    c.flash = !c.flash;
    s.message = c.flash
      ? '손전등 ON · 빛이 추적자를 유인합니다.'
      : '손전등 OFF · 낮은 자세로 조용히 이동하세요.';
  }
  if (c.kind === 'factory' && action === 'primary') {
    if (c.hang) {
      c.hang = false;
      c.z += 1.5;
      c.y = 0.1;
      c.vy = 8;
      c.grabbed = true;
      s.message = '난간을 잡고 올라갑니다!';
    } else if (c.y <= 0.02) {
      c.vy = 8.7;
      c.jump = 1;
      s.eventId++;
      s.eventKind = 'kick';
    }
  }
  if (
    c.kind === 'chase' &&
    action === 'primary' &&
    c.fuel >= 25 &&
    c.boost <= 0
  ) {
    c.boost = 2;
    c.fuel -= 25;
    s.message = '부스트! 직선 구간에서 추격을 벌리세요.';
  }
}
function wall(x, z) {
  return STORAGE.some(
    (b) =>
      Math.abs(x - b.x) < b.w / 2 + 0.65 && Math.abs(z - b.z) < b.d / 2 + 0.65,
  );
}
function visible(a, b) {
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    if (wall(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
  }
  return true;
}
export function challengeTick(s, dt, input = {}) {
  const c = s.challenge;
  c.hurt = Math.max(0, c.hurt - dt);
  const rawX = Number(input.x) || 0,
    rawZ = Number(input.z) || 0,
    len = Math.max(1, Math.hypot(rawX, rawZ)),
    ix = rawX / len,
    iz = rawZ / len;
  if (c.kind === 'blackout') {
    c.sprinting = !!input.sprint;
    const speed = c.sprinting ? 6.5 : 3.8;
    c.speed = Math.hypot(ix, iz) * speed;
    if (c.speed > 0.05) c.heading = Math.atan2(ix, iz);
    let nx = clamp(c.x + ix * speed * dt, -16, 16),
      nz = clamp(c.z + iz * speed * dt, -30, 26);
    if (!wall(nx, c.z)) c.x = nx;
    if (!wall(c.x, nz)) c.z = nz;
    c.charge = clamp(c.charge + (c.flash ? -2.4 : 1.1) * dt, 0, 100);
    if (c.charge === 0) c.flash = false;
    CELLS.forEach((p, i) => {
      if (!c.cells.includes(i) && Math.hypot(c.x - p.x, c.z - p.z) < 1.8) {
        c.cells.push(i);
        c.charge = Math.min(100, c.charge + 30);
        s.message = `전원 장치 ${c.cells.length}/3 확보 · 출구로 전력을 연결합니다.`;
        s.eventId++;
        s.eventKind = 'success';
      }
    });
    for (let i = 0; i < c.hunters.length; i++) {
      const h = c.hunters[i],
        d = Math.hypot(c.x - h.x, c.z - h.z),
        seen = d < (c.flash ? 17 : c.sprinting ? 10 : 4) && visible(h, c);
      h.alert = clamp(h.alert + (seen ? dt * 1.4 : -dt * 0.45), 0, 1);
      if (seen) h.lastSeen = { x: c.x, z: c.z };
      const tx =
          h.alert > 0.4 && h.lastSeen
            ? h.lastSeen.x
            : Math.sin(s.elapsed * 0.17 + i * 3) * 13,
        tz =
          h.alert > 0.4 && h.lastSeen
            ? h.lastSeen.z
            : -11 + Math.cos(s.elapsed * 0.14 + i * 2) * 17;
      const n = Math.hypot(tx - h.x, tz - h.z) || 1,
        v = h.alert > 0.4 ? 4.7 : 2;
      const hx = clamp(h.x + ((tx - h.x) / n) * v * dt, -16, 16),
        hz = clamp(h.z + ((tz - h.z) / n) * v * dt, -29, 25);
      if (!wall(hx, h.z)) h.x = hx;
      if (!wall(h.x, hz)) h.z = hz;
      if (d < 1.35 && !c.hurt) {
        c.health -= 34;
        c.hurt = 1.8;
        s.message = '추적자가 가까워졌습니다! 선반 뒤로 시야를 끊으세요.';
      }
    }
    if (c.health <= 0)
      end(
        s,
        false,
        '추적자에게 붙잡혔습니다. 손전등을 끄고 선반 뒤로 돌아가세요.',
        'shot',
      );
    else if (c.cells.length === 3 && Math.hypot(c.x, c.z + 29) < 3)
      end(s, true, '전력을 복구하고 정전 시설에서 탈출했습니다.');
  }
  if (c.kind === 'factory') {
    if (c.hang) {
      c.hangTime -= dt;
      c.speed = 0;
      if (c.hangTime <= 0)
        end(s, false, '매달린 손을 놓쳤습니다. 행동 버튼으로 올라오세요.');
      return;
    }
    const speed = c.y > 0.1 ? 6.8 : 5.5;
    c.x = clamp(c.x + ix * speed * dt, -6, 6);
    c.z = clamp(c.z - iz * speed * dt, 0, 94);
    c.speed = Math.hypot(ix, iz) * speed;
    if (c.speed > 0.01) c.heading = Math.atan2(ix, iz);
    const onBelt = c.z > 32 && c.z < 40;
    c.z = Math.max(0, c.z + (onBelt ? -1.2 : 0) * dt);
    if (c.vy !== 0 || c.y > 0) {
      c.vy -= 18 * dt;
      c.y += c.vy * dt;
      if (c.y <= 0) {
        c.y = 0;
        c.vy = 0;
      }
    }
    const gap = GAPS.find((g) => c.z > g.a && c.z < g.b && Math.abs(c.x) < 3.5);
    if (gap && c.y < 0.18) {
      if (gap.b - c.z < 1.1 && !c.grabbed) {
        c.hang = true;
        c.hangTime = 2;
        c.z = gap.b - 0.2;
        c.y = -0.7;
        s.message = '난간에 매달렸습니다! 올라가기 버튼!';
      } else
        end(
          s,
          false,
          '끊어진 중앙 발판입니다. 점프하거나 양옆 우회로를 이용하세요.',
        );
      return;
    }
    if (!gap) c.grabbed = false;
    for (let i = 0; i < PRESSES.length; i++) {
      const p = PRESSES[i],
        phase = (s.elapsed + i * 0.6) % 3;
      if (Math.abs(c.z - p) < 1.3 && Math.abs(c.x) < 3.8 && phase > 2.05) {
        end(
          s,
          false,
          '압착기에 끼었습니다. 붉은 불에서는 멈추거나 옆으로 우회하세요.',
        );
        return;
      }
    }
    if (c.z > 58 && c.z < 64 && Math.abs(c.x) < 3.8) {
      let slab = c.collapses.find((p) => p.id === 0);
      if (!slab) {
        slab = { id: 0, time: s.elapsed };
        c.collapses.push(slab);
        s.message = '발판이 무너집니다. 멈추지 말고 건너세요!';
      }
      if (s.elapsed - slab.time > 1.7 && c.y < 0.3) {
        end(
          s,
          false,
          '무너진 발판에서 추락했습니다. 옆길을 이용하거나 빠르게 건너세요.',
        );
        return;
      }
    }
    if (c.z >= 92) end(s, true, '붕괴하는 공장을 통과했습니다.');
  }
  if (c.kind === 'chase') {
    c.boost = Math.max(0, c.boost - dt);
    c.fuel = clamp(c.fuel + dt * 4, 0, 100);
    const target = iz > 0.2 ? 9 : c.boost > 0 ? 39 : 24;
    c.velocity += (target - c.velocity) * dt * 2;
    c.x = clamp(c.x + ix * (7 + c.velocity * 0.1) * dt, -8.5, 8.5);
    c.z += c.velocity * dt;
    c.speed = c.velocity;
    c.heading = ix * 0.25;
    c.pursuit = clamp(c.pursuit + (c.velocity - 22) * dt * 0.4, 0, 70);
    for (let i = 0; i < ROADBLOCKS.length; i++) {
      const b = ROADBLOCKS[i];
      if (
        !c.hit.has(i) &&
        Math.abs(c.z - b.z) < 2.8 &&
        Math.abs(c.x - b.x) < b.w / 2 + 1
      ) {
        c.hit.add(i);
        c.health -= 24;
        c.velocity *= 0.4;
        c.pursuit -= 8;
        c.hurt = 1;
        s.message = '충돌! 갈림길과 장애물을 보고 미리 조향하세요.';
      }
    }
    if (Math.abs(c.x) > 8) c.pursuit -= dt * 2;
    if (c.z > 285 && c.z < 325 && Math.abs(c.x) < 2.2) {
      c.velocity *= Math.exp(-dt * 1.5);
      s.message = '도로 중앙이 봉쇄됐습니다. 좌우 갈림길로 빠지세요!';
    }
    if (c.health <= 0 || c.pursuit <= 0)
      end(
        s,
        false,
        '추격에 붙잡혔습니다. 충돌을 피하고 부스트로 거리를 벌리세요.',
        'shot',
      );
    else if (c.z >= 600) end(s, true, '검문선을 돌파하고 탈출했습니다!');
  }
  s.x = c.x;
  s.z = c.kind === 'blackout' ? c.z : -c.z;
  s.speed = c.speed;
  s.heading = c.heading;
}
