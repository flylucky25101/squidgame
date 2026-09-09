export const ROUNDS = [
  [
    '무궁화꽃이 피었습니다',
    '5분 안에 결승선을 넘으세요. 영희가 돌아보면 정지하세요. 군중을 피해 길을 찾으세요.',
    300,
  ],
  [
    '설탕 뽑기',
    '모양을 고르고 윤곽을 따라 바늘을 움직이세요. 설탕이 깨지면 탈락합니다. 제한 시간 10분.',
    600,
  ],
  [
    '줄다리기',
    '10명 대 10명. 중앙 박자에 맞춰 당겨 상대 팀을 낭떠러지로 끌어내리세요.',
    180,
  ],
  [
    '제기차기',
    '시즌 2의 제기차기. 내려오는 제기가 발 높이에 왔을 때 차세요. 땅에 떨어뜨리지 않고 5번 연속 차면 통과합니다.',
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
    jegiY: 0.9,
    jegiV: 0,
    jegiActive: false,
    kicks: 0,
    jegiReset: 0,
    kickAt: -10,
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
  s.stamina = Math.min(1, s.stamina + dt * 0.16);
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
      s.defenderCooldown = 1.7;
    }
  } else if (!s.opponentStun && s.squidStage !== 'entrance') {
    if (d < 2.3 && s.defenderCooldown === 0) s.defenderWindup = 0.65;
    else if (d > 1.2) {
      const nx = s.opponentX + (dx / d) * dt * 3.1,
        nz = s.opponentZ + (dz / d) * dt * 3.1;
      if (insideSquid(nx, nz)) {
        s.opponentX = nx;
        s.opponentZ = nz;
      }
    }
  }
}
export function tick(s, dt, input = {}) {
  dt = clamp(dt, 0, 0.05);
  if (s.status === 'won') {
    s.resultTime = Math.min(3, s.resultTime + dt);
    return;
  }
  if (s.status === 'dying') {
    s.deathTime += dt;
    if (s.deathTime >= 2.5) s.status = 'lost';
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
    s.lightRemaining -= dt;
    if (s.lightRemaining <= 0) {
      if (s.light === 'green') {
        s.light = 'warning';
        s.lightRemaining = 1.2;
      } else if (s.light === 'warning') {
        s.light = 'red';
        s.lightRemaining = 2.6 + s.random() * 2.2;
      } else {
        s.light = 'green';
        s.lightRemaining = 3.2 + s.random() * 3;
        s.cycle++;
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
    const speed = s.round === 5 && s.squidStage === 'neck' ? 3.4 : 6.5;
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
  if (s.round === 3) {
    if (s.jegiReset > 0) {
      s.jegiReset -= dt;
      if (s.jegiReset <= 0) {
        s.jegiActive = false;
        s.jegiY = 0.9;
        s.jegiV = 0;
      }
    } else if (s.jegiActive) {
      s.jegiV -= dt * 6;
      s.jegiY += s.jegiV * dt;
      if (s.jegiY <= 0.12) {
        s.jegiY = 0.12;
        s.kicks = 0;
        s.jegiReset = 1;
        announce(s, '제기가 땅에 닿았습니다. 다시 5회에 도전하세요.', 'miss');
      }
    }
  }
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
export function act(s, value) {
  if (s.status !== 'playing') return;
  if (
    s.round === 0 &&
    value === 'push' &&
    s.light === 'green' &&
    s.elapsed - s.pushAt > 1.2
  ) {
    s.pushAt = s.elapsed;
    for (const n of s.crowd)
      if (n.alive && Math.hypot(n.x - s.x, n.z - s.z) < 2.5) {
        n.x = clamp(n.x + (n.x >= s.x ? 1.2 : -1.2), -28, 28);
        n.stagger = 0.65;
      }
    announce(s, '앞의 공간을 확보했습니다.', 'shove');
  }
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
  if (s.round === 3) {
    if (s.jegiReset > 0 || s.elapsed - s.kickAt < 0.5) return;
    s.kickAt = s.elapsed;
    if (!s.jegiActive || (s.jegiV < 0 && s.jegiY >= 0.25 && s.jegiY <= 1.15)) {
      s.jegiActive = true;
      s.jegiV = 3.8 + (s.kicks % 3) * 0.25;
      s.kicks++;
      announce(s, `${s.kicks} / 5 연속 성공`, 'kick');
      if (s.kicks === 5) finish(s, true, '제기를 다섯 번 연속 찼습니다.');
    } else
      announce(s, '헛발질 · 발을 다시 내릴 때까지 잠깐 기다리세요.', 'miss');
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
      s.opponentStun = 1.2;
      s.defenderWindup = 0;
      s.opponentX += (dx / (d || 1)) * 2;
      s.opponentZ += (dz / (d || 1)) * 2;
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
