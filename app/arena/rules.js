import { swipeVelocity, segmentHitsStone } from './stone.js';
export const ROUNDS = [
  [
    '무궁화꽃이 피었습니다',
    '5분 안에 결승선을 넘으세요. 영희가 돌아보면 정지하세요. 군중을 피해 길을 찾으세요.',
    300,
  ],
  [
    '설탕 뽑기',
    '상자를 열면 네 가지 중 한 모양이 무작위로 나옵니다. 윤곽을 따라 분리하세요. 설탕이 깨지면 탈락합니다.',
    600,
  ],
  [
    '줄다리기',
    '10명 대 10명. 중앙 박자에 맞춰 당겨 상대 팀을 낭떠러지로 끌어내리세요.',
    180,
  ],
  [
    '비석치기',
    '아래에서 위로 스와이프해 돌을 던지세요. 앞에 세운 비석을 넘어뜨리면 통과합니다. 빗나가면 돌을 회수해 다시 던집니다.',
    300,
  ],
  [
    '징검다리',
    '18쌍의 유리 중 강화유리를 골라 건너세요. 기억 도움을 켜면 시작할 때 안전 발판을 보여줍니다.',
    960,
  ],
  [
    '오징어 게임',
    '외발로 목을 가로지르면 두 발을 쓸 수 있습니다. 아래 입구로 들어가 머리의 원을 밟으세요. 경계 밖으로 밀려나면 탈락합니다.',
    300,
  ],
];
export const SHAPES = ['동그라미', '세모', '별', '우산'];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const CHANT = [
  '무',
  '궁',
  '화',
  '꽃',
  '이',
  '피',
  '었',
  '습',
  '니',
  '다',
];
export function chantPattern(random) {
  return CHANT.map(() => 0.24 + random() * 0.43);
}
export function beginRound(s) {
  if (s.status !== 'ready') return;
  if (s.round === 1) {
    s.shape = Math.min(3, Math.floor(s.random() * 4));
    s.trace = shapePoints(s.shape);
    s.boxTime = 0;
    s.status = 'opening';
  } else s.status = 'playing';
}
export function shapePoints(shape) {
  let v = [];
  if (shape === 0)
    for (let i = 0; i <= 100; i++) {
      const a = -Math.PI / 2 + (i / 100) * Math.PI * 2;
      v.push([150 + 96 * Math.cos(a), 150 + 96 * Math.sin(a)]);
    }
  if (shape === 1)
    v = [
      [150, 44],
      [253, 225],
      [47, 225],
      [150, 44],
    ];
  if (shape === 2) {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5,
        r = i % 2 ? 44 : 108;
      v.push([150 + r * Math.cos(a), 150 + r * Math.sin(a)]);
    }
    v.push(v[0]);
  }
  if (shape === 3) {
    for (let i = 0; i <= 40; i++) {
      const a = Math.PI + (i / 40) * Math.PI;
      v.push([150 + 110 * Math.cos(a), 146 + 100 * Math.sin(a)]);
    }
    v.push([210, 128], [168, 148], [168, 218]);
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI;
      v.push([144 + 24 * Math.cos(a), 218 + 24 * Math.sin(a)]);
    }
    v.push(
      [120, 202],
      [137, 202],
      [137, 218],
      [148, 218],
      [148, 148],
      [103, 128],
      [40, 146],
    );
  }
  const points = [v[0]];
  for (let i = 1; i < v.length; i++) {
    const [ax, ay] = v[i - 1],
      [bx, by] = v[i],
      n = Math.ceil(Math.hypot(bx - ax, by - ay) / 5);
    for (let j = 1; j <= n; j++)
      points.push([ax + ((bx - ax) * j) / n, ay + ((by - ay) * j) / n]);
  }
  return points;
}
export function newRun(round = 0, practice = false, random = Math.random) {
  return {
    round,
    practice,
    status: 'ready',
    time: ROUNDS[round][2],
    elapsed: 0,
    x: round === 5 ? -13 : 0,
    z: round === 5 ? 0 : round === 4 ? 38 : 44,
    heading: Math.PI,
    speed: 0,
    progress: 0,
    shape: 0,
    trace: shapePoints(0),
    damage: 0,
    force: 0.5,
    lastAction: -10,
    message: '',
    messageUntil: 0,
    random,
    crowd: Array.from({ length: 455 }, (_, i) => ({
      id: i + 1,
      x: ((i % 25) - 12) * 2.25,
      z: 6 + Math.floor(i / 25) * 1.95,
      alive: true,
      finished: false,
      speed: 3.1 + random() * 2.1,
      phase: random() * 6.28,
      stagger: 0,
      panic: 0,
      fall: 0,
    })),
    light: 'green',
    lightRemaining: 4.8,
    chant: chantPattern(random),
    chantTime: 0,
    syllable: 0,
    cycle: 0,
    nextEvent: 7,
    eventId: 0,
    eventKind: '',
    shotId: 0,
    shotTarget: null,
    deathTime: 0,
    resultTime: 0,
    deathKind: 'shot',
    bridge: Array.from({ length: 18 }, () => (random() < 0.5 ? 0 : 1)),
    memory: true,
    revealTime: 10,
    jump: null,
    broken: -1,
    boxTime: 0,
    stone: { x: 0, y: 1.2, z: 8, vx: 0, vy: 0, vz: 0, active: false },
    attempts: 0,
    retrieveTime: 0,
    retrieveDuration: 0,
    stoneHit: false,
    stoneHitTime: 0,
    throwAt: -10,
    opponentX: 0,
    opponentZ: 0,
    opponentStun: 0,
    defenderWindup: 0,
    defenderCooldown: 1,
    pushAt: -10,
    squidStage: 'neck',
    neckEntered: false,
    stamina: 1,
  };
}
export const signal = (s) => s.light;
export function finish(s, win, message, kind = 'shot') {
  if (s.status !== 'playing') return;
  s.status = win ? 'won' : 'dying';
  s.message = message;
  s.speed = 0;
  s.deathTime = 0;
  s.deathKind = kind;
  if (!win && kind === 'shot') {
    s.shotId++;
    s.shotTarget = { x: s.x, z: s.z };
  }
}
export function announce(s, message, kind = 'crowd') {
  s.message = message;
  s.messageUntil = s.elapsed + 3.5;
  s.eventId++;
  s.eventKind = kind;
}
export function chooseShape(s, shape) {
  if (
    s.status !== 'ready' ||
    s.round !== 1 ||
    !Number.isInteger(shape) ||
    shape < 0 ||
    shape > 3
  )
    return;
  s.shape = shape;
  s.trace = shapePoints(shape);
  s.progress = 0;
}
export function joystickVector(dx, dy, radius = 52) {
  const len = Math.hypot(dx, dy);
  if (len < radius * 0.14) return { x: 0, z: 0 };
  const n = Math.min(1, len / radius);
  return { x: (dx / len) * n, z: (dy / len) * n };
}
export function crowdStep(s, dt) {
  const moving = s.light === 'green';
  for (const n of s.crowd) {
    if (!n.alive) {
      n.fall = Math.min(1, n.fall + dt * 2.3);
      continue;
    }
    n.stagger = Math.max(0, n.stagger - dt);
    n.panic = Math.max(0, n.panic - dt);
    if (n.finished) continue;
    if (moving && !n.stagger) {
      n.z -= n.speed * dt;
      n.x = clamp(
        n.x + Math.sin(s.elapsed * 0.8 + n.phase) * dt * 0.55,
        -28,
        28,
      );
    }
    if (n.z < -33) {
      n.finished = true;
      n.z = -35 - (n.id % 5) * 1.1;
    }
  }
  // Spatial hashing keeps the 455-person crowd affordable on mobile.
  const grid = new Map(),
    size = 1.25,
    key = (x, z) => `${x},${z}`;
  for (const n of s.crowd) {
    if (!n.alive || n.finished) continue;
    const gx = Math.floor(n.x / size),
      gz = Math.floor(n.z / size);
    for (let x = gx - 1; x <= gx + 1; x++)
      for (let z = gz - 1; z <= gz + 1; z++)
        for (const o of grid.get(key(x, z)) || []) {
          const dx = n.x - o.x,
            dz = n.z - o.z,
            d = Math.hypot(dx, dz);
          if (d < 0.86) {
            const ux = d > 1e-5 ? dx / d : 1,
              uz = d > 1e-5 ? dz / d : 0,
              p = (0.86 - d) * 0.5;
            n.x += ux * p;
            n.z += uz * p;
            o.x -= ux * p;
            o.z -= uz * p;
          }
        }
    const k = key(gx, gz);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(n);
  }
  // Crowd contact cannot push a stationary player to a red-light death.
  if (moving)
    for (let pass = 0; pass < 3; pass++)
      for (const n of s.crowd) {
        if (!n.alive || n.finished) continue;
        const dx = s.x - n.x,
          dz = s.z - n.z,
          d = Math.hypot(dx, dz);
        if (d < 1) {
          s.x += (d > 1e-5 ? dx / d : 1) * (1 - d);
          s.z += (d > 1e-5 ? dz / d : 0) * (1 - d);
        }
      }
  if (s.elapsed >= s.nextEvent) {
    s.nextEvent = s.elapsed + 6 + s.random() * 5;
    const candidates = s.crowd.filter((n) => n.alive && !n.finished);
    if (candidates.length) {
      const n = candidates[Math.floor(s.random() * candidates.length)];
      n.panic = 2;
      n.stagger = 1.5;
      if (s.light === 'red') {
        n.alive = false;
        s.shotId++;
        s.shotTarget = { x: n.x, z: n.z };
        announce(
          s,
          `${String(n.id).padStart(3, '0')}번 움직임 감지 · 자리에서 멈추세요`,
          'shot',
        );
      } else {
        for (const o of candidates)
          if (Math.hypot(o.x - n.x, o.z - n.z) < 4)
            o.stagger = 0.5 + s.random();
        announce(
          s,
          [
            '누군가 비명을 질렀습니다. 앞쪽 참가자들이 멈칫합니다.',
            '앞줄에서 실랑이가 벌어졌습니다. 빈 공간으로 돌아가세요.',
            '참가자가 균형을 잃었습니다. 밀집한 곳을 피하세요.',
          ][Math.floor(s.random() * 3)],
          'panic',
        );
      }
    }
  }
}
export function insideSquid(x, z) {
  if (z >= 0 && z <= 24) return Math.abs(x) <= 10;
  if (z < 0 && z >= -20) return Math.abs(x) <= (10 * (z + 20)) / 20;
  return Math.hypot(x, z + 21) <= 3;
}
export function squidStep(s, dt, previous) {
  s.stamina = Math.min(1, s.stamina + dt * 0.28);
  s.opponentStun = Math.max(0, s.opponentStun - dt);
  s.defenderCooldown = Math.max(0, s.defenderCooldown - dt);
  if (s.squidStage === 'neck') {
    if (Math.abs(s.x) < 10 && Math.abs(s.z) > 2) {
      s.x = previous.x;
      s.z = previous.z;
    }
    if (s.x <= -10) s.neckEntered = false;
    if (s.x > -10 && Math.abs(s.z) <= 2) s.neckEntered = true;
    if (s.neckEntered && s.x >= 10 && Math.abs(s.z) <= 2) {
      s.squidStage = 'entrance';
      announce(
        s,
        '암행어사! 두 발로 이동할 수 있습니다. 아래 입구로 돌아가세요.',
        'success',
      );
    }
  } else if (s.squidStage === 'entrance') {
    if (insideSquid(s.x, s.z) && !(Math.abs(s.x) < 3 && previous.z >= 23.5)) {
      s.x = previous.x;
      s.z = previous.z;
    }
    if (Math.abs(s.x) < 3 && s.z < 24 && previous.z >= 24) {
      s.squidStage = 'attack';
      announce(s, '입구 통과 · 머리의 원을 밟으세요.', 'success');
    }
  } else if (s.squidStage === 'attack') {
    if (Math.hypot(s.x, s.z + 21) < 2.8)
      return finish(s, true, '오징어 머리를 밟았습니다. 최후의 생존자입니다.');
    if (!insideSquid(s.x, s.z))
      return finish(s, false, '경기장 경계 밖으로 나갔습니다.');
  }
  s.x = clamp(s.x, -17, 17);
  s.z = clamp(s.z, -26, 29);
  if (s.squidStage === 'entrance') {
    const d = Math.hypot(s.opponentX, 18 - s.opponentZ);
    if (d > 0.1) {
      s.opponentX -= (s.opponentX / d) * dt * 4.25;
      s.opponentZ += ((18 - s.opponentZ) / d) * dt * 4.25;
    }
  }
  const dx = s.x - s.opponentX,
    dz = s.z - s.opponentZ,
    d = Math.hypot(dx, dz);
  if (s.defenderWindup > 0) {
    s.defenderWindup -= dt;
    if (s.defenderWindup <= 0) {
      if (d < 2.8) {
        s.x += (dx / (d || 1)) * 1.65;
        s.z += (dz / (d || 1)) * 1.65;
        if (s.squidStage === 'neck' && Math.abs(s.x) < 10)
          s.z = clamp(s.z, -1.95, 1.95);
        announce(s, '수비수의 밀치기! 경계를 조심하세요.', 'shove');
        if (s.squidStage === 'attack' && !insideSquid(s.x, s.z))
          finish(s, false, '수비수에게 경계 밖으로 밀려났습니다.');
      }
      s.defenderCooldown = 1.15;
    }
  } else if (!s.opponentStun && s.squidStage !== 'entrance') {
    if (d < 2.3 && s.defenderCooldown === 0) s.defenderWindup = 0.65;
    else if (d > 1.2) {
      const tx =
        s.squidStage === 'attack' ? s.x + Math.sin(s.heading) * 1.5 : s.x;
      const tz =
        s.squidStage === 'attack' ? s.z + Math.cos(s.heading) * 1.5 : s.z;
      const chase = Math.hypot(tx - s.opponentX, tz - s.opponentZ) || 1;
      const nx = s.opponentX + ((tx - s.opponentX) / chase) * dt * 4.25,
        nz = s.opponentZ + ((tz - s.opponentZ) / chase) * dt * 4.25;
      if (insideSquid(nx, nz)) {
        s.opponentX = nx;
        s.opponentZ = nz;
      }
    }
  }
  // Body contact slows an escape; contestants cannot pass through one another.
  if (s.squidStage === 'attack' && d < 1.15 && !s.opponentStun) {
    const ux = d > 0.001 ? dx / d : 1,
      uz = d > 0.001 ? dz / d : 0;
    s.x = s.opponentX + ux * 1.15;
    s.z = s.opponentZ + uz * 1.15;
    if (!insideSquid(s.x, s.z))
      finish(s, false, '수비수와 몸싸움 중 경계 밖으로 밀려났습니다.');
  }
}
export function tick(s, dt, input = {}) {
  dt = clamp(dt, 0, 0.05);
  if (s.status === 'opening') {
    s.boxTime += dt;
    if (s.boxTime >= 2.8) s.status = 'playing';
    return;
  }
  if (s.status === 'won') {
    s.resultTime = Math.min(3, s.resultTime + dt);
    return;
  }
  if (s.status === 'dying') {
    s.deathTime += dt;
    if (s.deathTime >= (s.round === 0 ? 4.8 : 2.5)) s.status = 'lost';
    return;
  }
  if (s.status !== 'playing') return;
  s.elapsed += dt;
  s.time = Math.max(0, s.time - dt);
  if (!s.time)
    return finish(
      s,
      false,
      '제한 시간이 끝났습니다.',
      s.round === 4 ? 'fall' : 'shot',
    );
  if (s.round === 0) {
    if (s.light === 'green') {
      s.chantTime += dt;
      let total = 0;
      s.syllable = 9;
      for (let i = 0; i < s.chant.length; i++) {
        total += s.chant[i];
        if (s.chantTime < total) {
          s.syllable = i;
          break;
        }
      }
      if (s.chantTime >= s.chant.reduce((a, b) => a + b, 0)) {
        s.light = 'turning';
        s.lightRemaining = 0.34;
      }
    } else {
      s.lightRemaining -= dt;
      if (s.lightRemaining <= 0) {
        if (s.light === 'turning') {
          s.light = 'red';
          s.lightRemaining = 1.6 + s.random() * 3.2;
        } else {
          s.light = 'green';
          s.chant = chantPattern(s.random);
          s.chantTime = 0;
          s.syllable = 0;
          s.cycle++;
        }
      }
    }
  }
  if (s.round === 0 || s.round === 5) {
    let x = input.x || 0,
      z = input.z || 0;
    const len = Math.hypot(x, z);
    if (len > 1) {
      x /= len;
      z /= len;
    }
    if (s.round === 0 && s.light === 'red' && len > 0.08)
      return finish(s, false, '영희가 움직임을 감지했습니다.');
    const speed = s.round === 5 ? (s.squidStage === 'neck' ? 2.8 : 3.55) : 6.5;
    s.speed = Math.min(1, len) * speed;
    if (len > 0.08) s.heading = Math.atan2(x, z);
    const previous = { x: s.x, z: s.z };
    s.x += x * speed * dt;
    s.z += z * speed * dt;
    if (s.round === 0) {
      crowdStep(s, dt);
      s.x = clamp(s.x, -28.5, 28.5);
      s.z = Math.min(46, s.z);
      if (s.z < -33) finish(s, true, '결승선을 통과했습니다.');
    } else squidStep(s, dt, previous);
  }
  if (s.round === 2) {
    s.force = clamp(
      s.force - dt * (0.014 + 0.008 * (1 + Math.sin(s.elapsed * 0.7))),
      0,
      1,
    );
    if (s.force === 0)
      finish(s, false, '우리 팀이 발판에서 끌려 내려갔습니다.', 'tug');
  }
  if (s.round === 3) stoneStep(s, dt);
  if (s.round === 4 && s.jump) {
    s.jump.t += dt;
    if (s.jump.t >= 0.52) {
      s.x = s.jump.x;
      s.z = s.jump.z;
      const safe = s.jump.safe;
      s.jump = null;
      if (!safe) {
        s.broken = s.progress;
        finish(s, false, '일반 유리가 깨졌습니다.', 'fall');
      } else {
        s.progress++;
        if (s.progress === s.bridge.length)
          finish(s, true, '18쌍의 유리다리를 모두 건넜습니다.');
      }
    }
  }
}
export function traceAt(s, x, y) {
  if (
    s.status !== 'playing' ||
    s.round !== 1 ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  )
    return;
  let nearest = -1,
    best = Infinity;
  for (let i = s.progress; i < Math.min(s.trace.length, s.progress + 6); i++) {
    const d = Math.hypot(x - s.trace[i][0], y - s.trace[i][1]);
    if (d < best) {
      best = d;
      nearest = i;
    }
  }
  if (best <= 10) {
    s.progress = nearest + 1;
    s.damage = Math.max(0, s.damage - 0.02);
    if (s.progress >= s.trace.length)
      finish(s, true, `${SHAPES[s.shape]} 모양을 온전히 분리했습니다.`);
  } else {
    const previous = s.trace[Math.max(0, s.progress - 1)];
    if (Math.hypot(x - previous[0], y - previous[1]) < 13) return;
    s.damage += 0.34;
    if (s.damage >= 1) finish(s, false, '윤곽 밖을 긁어 설탕이 깨졌습니다.');
  }
}
export function throwStone(s, dx, dy, seconds) {
  if (
    s.round !== 3 ||
    s.status !== 'playing' ||
    s.stone.active ||
    s.retrieveTime > 0 ||
    s.stoneHit
  )
    return;
  const v = swipeVelocity(dx, dy, seconds);
  if (!v) return;
  s.stone = { x: 0, y: 1.2, z: 8, ...v, active: true };
  s.attempts++;
  s.throwAt = s.elapsed;
  announce(s, '돌을 던졌습니다.', 'throw');
}
export function stoneStep(s, dt) {
  if (s.stoneHit) {
    s.stoneHitTime += dt;
    if (s.stoneHitTime > 1.15) finish(s, true, '비석을 넘어뜨렸습니다.');
    return;
  }
  if (s.retrieveTime > 0) {
    s.retrieveTime = Math.max(0, s.retrieveTime - dt);
    if (!s.retrieveTime) {
      s.stone = { x: 0, y: 1.2, z: 8, vx: 0, vy: 0, vz: 0, active: false };
      announce(s, '돌을 회수했습니다. 다시 던지세요.', 'ready');
    }
    return;
  }
  const p = s.stone;
  if (!p.active) return;
  const old = { x: p.x, y: p.y, z: p.z };
  p.vy -= 9.8 * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.z += p.vz * dt;
  if (segmentHitsStone(old, p)) {
    s.stoneHit = true;
    p.active = false;
    announce(s, '명중!', 'stone-hit');
  } else if (p.y <= 0.12) {
    p.y = 0.12;
    p.active = false;
    s.retrieveDuration = Math.max(2, Math.min(8, Math.hypot(p.x, p.z - 8) / 4));
    s.retrieveTime = s.retrieveDuration;
    announce(
      s,
      Math.abs(p.x) > 0.7
        ? '방향이 빗나갔습니다. 돌을 회수합니다.'
        : p.z > -7
          ? '조금 더 길고 빠르게 던져보세요. 돌을 회수합니다.'
          : '너무 높거나 강했습니다. 돌을 회수합니다.',
      'miss',
    );
  }
}
export function act(s, value) {
  if (s.status !== 'playing') return;
  if (s.round === 2) {
    if (s.elapsed - s.lastAction < 0.3) return;
    s.lastAction = s.elapsed;
    const good = Math.abs(Math.sin(s.elapsed * 3)) < 0.32;
    s.force = clamp(s.force + (good ? 0.075 : -0.055), 0, 1);
    announce(
      s,
      good
        ? '하나, 둘! 함께 당깁니다.'
        : '박자가 어긋났습니다. 중앙에 맞춰 당기세요.',
      good ? 'pull' : 'miss',
    );
    if (s.force >= 1) finish(s, true, '상대 팀을 낭떠러지로 끌어내렸습니다.');
  }
  if (s.round === 4) {
    if (
      s.jump ||
      (s.memory && s.elapsed < s.revealTime) ||
      !(value === 0 || value === 1)
    )
      return;
    s.jump = {
      t: 0,
      fromX: s.x,
      fromZ: s.z,
      x: value === 0 ? -2 : 2,
      z: 38 - (s.progress + 1) * 4,
      safe: value === s.bridge[s.progress],
    };
  }
  if (
    s.round === 5 &&
    value === 'push' &&
    s.stamina >= 0.45 &&
    s.elapsed - s.pushAt > 1
  ) {
    s.pushAt = s.elapsed;
    s.stamina -= 0.45;
    const dx = s.opponentX - s.x,
      dz = s.opponentZ - s.z,
      d = Math.hypot(dx, dz);
    if (d < 3.2) {
      s.opponentStun = 0.72;
      s.defenderWindup = 0;
      s.opponentX += (dx / (d || 1)) * 1.5;
      s.opponentZ += (dz / (d || 1)) * 1.5;
      if (!insideSquid(s.opponentX, s.opponentZ) && s.squidStage === 'attack')
        finish(s, true, '수비수를 경기장 밖으로 밀어냈습니다.');
      else {
        s.opponentX = clamp(s.opponentX, -9, 9);
        s.opponentZ = clamp(s.opponentZ, 0, 23);
        announce(s, '수비수가 균형을 잃었습니다.', 'shove');
      }
    }
  }
}
