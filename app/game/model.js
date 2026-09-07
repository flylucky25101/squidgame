export const SAVE_KEY = 'last-city-organization-v1';
export const WORLD_LIMIT = 143;
export const PLACES = {
  home: { x: 0, z: 36, label: '은신처', color: '#9be6c8' },
  gate: { x: 0, z: 0, label: '참가 등록', color: '#fa6385' },
  bank: { x: 0, z: -60, label: '채무 상환소', color: '#f4cb78' },
  exit: { x: 120, z: -120, label: '최종 회수 차량', color: '#9be6c8' },
};
export const PLANTS = [
  { id: 'west', x: -60, z: -60, label: '서부 변전소' },
  { id: 'east', x: 60, z: 0, label: '동부 변전소' },
  { id: 'south', x: 0, z: 108, label: '항만 변전소' },
];
export const ASSETS = [
  {
    id: 'garage',
    name: '뒷골목 정비소',
    cost: 3500,
    description:
      '도시에서 차량 내구도 +50%. 대회에서는 기본 내구도가 적용됩니다.',
  },
  {
    id: 'clinic',
    name: '지하 진료소',
    cost: 5000,
    description: '도시 복귀 시 의료품 2개 추가. 대회 의료품은 모두 동일합니다.',
  },
  {
    id: 'network',
    name: '항만 정보망',
    cost: 7500,
    description: '도시 밀수품 수익 +50%. 조직의 영향력이 상승합니다.',
  },
];
const NAMES = [
  '민수',
  '수연',
  '도윤',
  '지아',
  '현우',
  '태오',
  '서진',
  '유리',
  '정호',
  '해린',
  '성우',
  '미래',
];
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const safeInt = (v, fallback = 0, max = 1e9) =>
  Number.isFinite(v) ? clamp(Math.floor(v), 0, max) : fallback;
export function sanitizeProfile(raw = {}) {
  if (!raw || typeof raw !== 'object') raw = {};
  return {
    version: 1,
    cash: safeInt(raw.cash, 1200),
    wins: safeInt(raw.wins),
    deaths: safeInt(raw.deaths),
    generation: Math.max(1, safeInt(raw.generation, 1)),
    assets: ASSETS.map((a) => a.id).filter(
      (id) => Array.isArray(raw.assets) && raw.assets.includes(id),
    ),
    faction: ['resistance', 'organizer'].includes(raw.faction)
      ? raw.faction
      : 'independent',
    influence: safeInt(raw.influence),
    bestTime: safeInt(raw.bestTime),
    history: Array.isArray(raw.history)
      ? raw.history
          .filter((v) => typeof v === 'string')
          .map((v) => v.slice(0, 120))
          .slice(0, 8)
      : [],
  };
}
export function seeded(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}
export function makeBuildings() {
  const random = seeded(89),
    blocks = [];
  for (const x of [-90, -30, 30, 90])
    for (const z of [-90, -30, 30, 90])
      for (let i = 0; i < 4; i++) {
        blocks.push({
          x: x + (i % 2 ? 12 : -12),
          z: z + (i < 2 ? -12 : 12),
          w: 17 + random() * 3,
          d: 17 + random() * 3,
          h: 6 + random() * 15,
          style: Math.floor(random() * 5),
        });
      }
  return blocks;
}
export const BUILDINGS = makeBuildings();
export function blocked(x, z, radius = 0.7) {
  if (Math.abs(x) > WORLD_LIMIT || Math.abs(z) > WORLD_LIMIT) return true;
  return BUILDINGS.some(
    (b) =>
      Math.abs(x - b.x) < b.w / 2 + radius &&
      Math.abs(z - b.z) < b.d / 2 + radius,
  );
}
export function moveBody(body, dx, dz, radius = 0.7) {
  let moved = false;
  if (!blocked(body.x + dx, body.z, radius)) {
    body.x += dx;
    moved = true;
  }
  if (!blocked(body.x, body.z + dz, radius)) {
    body.z += dz;
    moved = true;
  }
  return moved;
}
export function lineClear(a, b) {
  const d = distance(a, b),
    n = Math.ceil(d / 2);
  for (let i = 1; i < n; i++)
    if (blocked(a.x + ((b.x - a.x) * i) / n, a.z + ((b.z - a.z) * i) / n, 0.05))
      return false;
  return true;
}
export function createGame(profile = {}, seed = Date.now()) {
  const random = seeded(seed),
    game = {
      profile: sanitizeProfile(profile),
      seed,
      phase: 'city',
      status: 'ready',
      elapsed: 0,
      phaseElapsed: 0,
      time: 0,
      player: {
        x: 0,
        z: 25,
        angle: Math.PI,
        hp: 100,
        stamina: 100,
        ammo: 24,
        reserve: 144,
        meds: 3,
        certificates: 0,
        carId: null,
        reload: 0,
        shotCooldown: 0,
      },
      crates: [],
      cars: [],
      npcs: [],
      activated: [],
      bullets: [],
      notes: [],
      noteId: 0,
      collected: [],
      kills: 0,
      wanted: 0,
      signal: 'green',
      signalRemaining: 25,
      signalHit: 0,
      blackout: false,
      blackoutWarned: false,
      pact: false,
      allyTrust: 0,
      won: false,
      payout: 0,
      result: '',
      lastDamage: 0,
      interaction: null,
      settlement: false,
    };
  const spots = [
    [-5, 28],
    [5, -24],
    [-60, 21],
    [60, -25],
    [86, 60],
    [-86, 0],
    [118, 28],
    [0, 87],
    [-60, -95],
    [60, 95],
    [-118, 88],
    [120, -91],
  ];
  game.cars = spots.map(([x, z], i) => ({
    id: `car-${i}`,
    x,
    z,
    angle: i % 2 ? 0 : Math.PI,
    speed: 0,
    hp: game.profile.assets.includes('garage') ? 150 : 100,
    stolen: false,
    color: ['#e5bd7c', '#698ca1', '#cd5d67', '#e4e1d6', '#526c58'][i % 5],
  }));
  const positions = [
    [7, 10],
    [-8, -28],
    [25, 7],
    [-30, -7],
    [7, -96],
    [-7, 80],
    [-60, 33],
    [-60, -28],
    [60, 35],
    [60, -92],
    [94, 60],
    [-92, 60],
    [93, -60],
    [-92, -60],
    [120, 58],
    [-120, -20],
    [33, 120],
    [-40, -120],
    [120, -40],
    [-60, 104],
    [32, -60],
    [60, 66],
    [0, -125],
    [-120, 70],
  ];
  game.crates = positions.map(([x, z], i) => ({
    id: `crate-${i}`,
    x,
    z,
    taken: false,
    value: 25,
    cash: 300 + Math.floor(random() * 200),
    cooldown: 0,
  }));
  for (let i = 0; i < 12; i++) {
    const road = [-120, -60, 0, 60, 120][Math.floor(random() * 5)];
    game.npcs.push({
      id: `rival-${i}`,
      name: NAMES[i],
      x: road + (random() > 0.5 ? 5 : -5),
      z: -110 + random() * 220,
      hp: 80,
      role: 'rival',
      angle: 0,
      cooldown: 1 + random() * 3,
      target: null,
      certificates: 0,
      hostile: i % 3 === 0,
      alive: true,
    });
  }
  game.npcs.push({
    id: 'ally',
    name: '윤서 · 정비공',
    x: 7,
    z: 24,
    hp: 120,
    role: 'ally',
    angle: 0,
    cooldown: 1,
    alive: true,
    target: null,
    certificates: 0,
    hostile: false,
  });
  for (let i = 0; i < 6; i++)
    game.npcs.push({
      id: `guard-${i}`,
      name: '집행국',
      x: [-60, 60, 120][i % 3],
      z: [-100, -40, 70, -70, 95, -120][i],
      hp: 110,
      role: 'guard',
      angle: 0,
      cooldown: i + 2,
      target: null,
      certificates: 0,
      hostile: true,
      alive: true,
    });
  game.player.meds = game.profile.assets.includes('clinic') ? 5 : 3;
  note(
    game,
    '해문시에 도착했습니다. 밀수품을 확보하거나, 분홍색 등록소에서 대회에 참가하세요.',
    'city',
  );
  return game;
}
export function note(g, text, kind = 'info') {
  g.notes.unshift({ id: ++g.noteId, text, kind, at: g.elapsed });
  g.notes = g.notes.slice(0, 5);
}
export function startTournament(g) {
  if (g.phase !== 'city' || !['playing', 'ready'].includes(g.status))
    return false;
  g.cars.forEach((c) => {
    if (c.hp > 0) c.hp = 100;
    c.speed = 0;
  });
  g.phase = 'debt';
  g.status = 'playing';
  g.time = 210;
  g.phaseElapsed = 0;
  g.elapsed = 0;
  Object.assign(g.player, {
    hp: 100,
    ammo: 24,
    reserve: 144,
    meds: 3,
    certificates: 0,
    reload: 0,
  });
  g.crates.forEach((c) => {
    c.taken = false;
  });
  g.collected = [];
  g.activated = [];
  g.wanted = 0;
  g.kills = 0;
  note(
    g,
    '관장: 증서 100을 확보하고 중앙 상환소에 납부하십시오. 적색 신호 중 구동·발포는 25 피해입니다.',
    'broadcast',
  );
  return true;
}
export function interactionFor(g) {
  const p = g.player;
  const nearest = g.crates
    .filter((c) => !c.taken && distance(p, c) < 4)
    .sort((a, b) => distance(p, a) - distance(p, b))[0];
  if (nearest)
    return {
      type: 'crate',
      id: nearest.id,
      text:
        g.phase === 'city'
          ? '밀수품 확보'
          : `증서 +${nearest.value} / 탄약 확보`,
    };
  if (distance(p, PLACES.home) < 5 && g.phase === 'city')
    return { type: 'home', text: '은신처에서 회복' };
  if (distance(p, PLACES.gate) < 5 && g.phase === 'city')
    return { type: 'gate', text: '도시 청산 대회 참가' };
  if (distance(p, PLACES.bank) < 6 && g.phase === 'debt')
    return { type: 'bank', text: `채무 상환 (${p.certificates}/100)` };
  const plant = PLANTS.find(
    (s) => distance(p, s) < 5 && !g.activated.includes(s.id),
  );
  if (plant && g.phase === 'power')
    return { type: 'plant', id: plant.id, text: `${plant.label} 복구` };
  if (distance(p, PLACES.exit) < 7 && g.phase === 'escape')
    return { type: 'exit', text: '마지막 회수 차량 탑승' };
  const ally = g.npcs.find((n) => n.id === 'ally' && n.alive);
  if (ally && distance(p, ally) < 4 && !g.pact && g.allyTrust >= 0)
    return { type: 'ally', text: '윤서와 동맹 · 우승 상금 공동 배당' };
  if (ally && distance(p, ally) < 4 && g.pact && ally.hp < 90 && p.meds > 0)
    return { type: 'healAlly', text: '윤서를 치료 · 의료품 1개' };
  return null;
}
export function interact(g) {
  if (g.status !== 'playing') return false;
  const a = interactionFor(g);
  if (!a) return false;
  if (a.type === 'crate') {
    const c = g.crates.find((c) => c.id === a.id);
    if (!c || c.taken) return false;
    c.taken = true;
    c.cooldown = 65;
    g.collected.push(c.id);
    g.player.reserve = Math.min(240, g.player.reserve + 18);
    if (g.phase === 'city') {
      const amount = Math.floor(
        c.cash * (g.profile.assets.includes('network') ? 1.5 : 1),
      );
      g.profile.cash += amount;
      note(g, `밀수품 처분 +${amount.toLocaleString()} C`, 'reward');
    } else {
      g.player.certificates += c.value;
      note(g, `증서 +${c.value} · 탄약 +18`, 'reward');
    }
    return true;
  }
  if (a.type === 'home') {
    g.player.hp = 100;
    g.player.meds = g.profile.assets.includes('clinic') ? 5 : 3;
    g.player.reserve = Math.max(g.player.reserve, 96);
    g.wanted = 0;
    note(g, '안전하게 회복했습니다. 조직 자산은 자동 저장됩니다.');
    return true;
  }
  if (a.type === 'gate') return startTournament(g);
  if (a.type === 'bank') {
    if (g.player.certificates < 100) {
      note(
        g,
        `증서 ${100 - g.player.certificates}개가 더 필요합니다.`,
        'warning',
      );
      return false;
    }
    g.player.certificates -= 100;
    g.phase = 'power';
    g.phaseElapsed = 0;
    g.time = 210;
    g.signal = 'green';
    note(
      g,
      '채무 상환 완료. 변전소 3곳을 복구하십시오. 윤서와 동맹을 맺으면 복구 시 치료를 받습니다.',
      'broadcast',
    );
    return true;
  }
  if (a.type === 'plant') {
    if (g.activated.includes(a.id)) return false;
    g.activated.push(a.id);
    g.player.reserve = Math.min(240, g.player.reserve + 36);
    const ally = g.npcs.find((n) => n.id === 'ally');
    if (g.pact && ally?.alive) {
      g.player.hp = Math.min(100, g.player.hp + 20);
      g.allyTrust++;
    }
    note(
      g,
      `전력망 복구 ${g.activated.length}/3${g.pact && ally?.alive ? ' · 윤서의 응급 처치 +20' : ''}`,
      'reward',
    );
    if (g.activated.length === 3) {
      g.phase = 'escape';
      g.phaseElapsed = 0;
      g.time = 150;
      g.blackout = false;
      note(
        g,
        '관장: 북동쪽 항만의 회수 차량이 출발합니다. 마지막 좌석을 확보하십시오.',
        'broadcast',
      );
    }
    return true;
  }
  if (a.type === 'exit') return finish(g, true);
  if (a.type === 'ally') {
    g.pact = true;
    g.allyTrust = 1;
    note(
      g,
      '윤서: “같이 나가요. 내가 뒤를 봐줄게요.” · 생존 시 상금 50% 공동 배당',
      'ally',
    );
    return true;
  }
  if (a.type === 'healAlly') {
    const n = g.npcs.find((n) => n.id === 'ally');
    g.player.meds--;
    n.hp = Math.min(120, n.hp + 55);
    g.allyTrust++;
    note(g, '윤서: “이 빚은 꼭 갚을게요.”', 'ally');
    return true;
  }
  return false;
}
export function buyAsset(g, id) {
  const a = ASSETS.find((a) => a.id === id);
  if (
    !a ||
    g.phase !== 'city' ||
    g.profile.assets.includes(id) ||
    g.profile.cash < a.cost
  )
    return false;
  g.profile.cash -= a.cost;
  g.profile.assets.push(id);
  g.profile.influence += 10;
  if (id === 'garage')
    g.cars.forEach((c) => {
      c.hp = Math.min(150, c.hp + 50);
    });
  note(g, `${a.name} 인수 완료`, 'reward');
  return true;
}
export function chooseFaction(g, faction) {
  if (g.phase !== 'city' || !['resistance', 'organizer'].includes(faction))
    return false;
  g.profile.faction = faction;
  note(
    g,
    faction === 'resistance'
      ? '해방 연합과 연결됐습니다. 동맹과 함께 탈출하면 영향력 +15.'
      : '집행국 공급 계약을 체결했습니다. 전력 복구 후 우승하면 영향력 +15.',
    'city',
  );
  return true;
}
export function enterCar(g) {
  if (g.status !== 'playing') return false;
  const p = g.player;
  if (p.carId) {
    const c = g.cars.find((c) => c.id === p.carId);
    if (Math.abs(c.speed) > 8) {
      note(g, '차량 속도를 줄인 뒤 내리세요.', 'warning');
      return false;
    }
    const options = [
      [3, 0],
      [-3, 0],
      [0, 4],
      [0, -4],
      [4, 4],
      [-4, -4],
    ];
    const free = options.find(([x, z]) => !blocked(c.x + x, c.z + z));
    if (!free) {
      note(g, '내릴 공간이 없습니다. 차량을 이동하세요.', 'warning');
      return false;
    }
    p.x = c.x + free[0];
    p.z = c.z + free[1];
    c.speed = 0;
    p.carId = null;
    note(g, '차량에서 내렸습니다.');
    return true;
  }
  const c = g.cars
    .filter((c) => c.hp > 0 && distance(p, c) < 6)
    .sort((a, b) => distance(p, a) - distance(p, b))[0];
  if (!c) {
    note(g, '차량 가까이에서 F를 누르세요.');
    return false;
  }
  p.carId = c.id;
  p.x = c.x;
  p.z = c.z;
  if (!c.stolen) {
    c.stolen = true;
    if (g.phase === 'city') g.wanted = Math.min(3, g.wanted + 0.8);
  }
  note(g, '차량 확보 · W 가속 / S 제동·후진 / A D 조향 / F 하차', 'reward');
  return true;
}
export function heal(g) {
  if (g.status !== 'playing' || g.player.meds < 1 || g.player.hp >= 100)
    return false;
  g.player.meds--;
  g.player.hp = Math.min(100, g.player.hp + 45);
  note(g, '응급 처치 +45', 'reward');
  return true;
}
export function reload(g) {
  if (
    g.status === 'playing' &&
    !g.player.reload &&
    g.player.ammo < 24 &&
    g.player.reserve > 0
  ) {
    g.player.reload = 1.3;
    return true;
  }
  return false;
}
export function damage(g, amount, reason = '집행국에게 쓰러졌습니다.') {
  if (g.status !== 'playing') return;
  g.player.hp = Math.max(0, g.player.hp - amount);
  g.lastDamage = 0.35;
  if (g.player.hp <= 0) finish(g, false, reason);
}
export function finish(g, won, reason = '') {
  if (
    g.settlement ||
    g.status !== 'playing' ||
    (won && (g.phase !== 'escape' || g.player.hp <= 0))
  )
    return false;
  g.settlement = true;
  g.won = won;
  g.status = 'finished';
  const ally = g.npcs.find((n) => n.id === 'ally');
  if (won) {
    const shared = g.pact && ally?.alive;
    g.payout = shared ? 10000 : 20000;
    g.profile.cash += g.payout;
    g.profile.wins++;
    g.profile.influence += 10;
    if (
      g.profile.faction === 'organizer' ||
      (g.profile.faction === 'resistance' && shared)
    )
      g.profile.influence += 15;
    g.profile.bestTime = !g.profile.bestTime
      ? Math.floor(g.elapsed)
      : Math.min(g.profile.bestTime, Math.floor(g.elapsed));
    g.result = shared
      ? '윤서와 함께 탈출했습니다. 약속대로 배당을 나눴습니다.'
      : '마지막 좌석을 확보했습니다. 해문시는 당신의 이름을 기억합니다.';
    g.profile.history.unshift(
      `#${String(g.profile.generation).padStart(3, '0')} 우승 · +${g.payout.toLocaleString()} C`,
    );
  } else if (g.phase === 'city') {
    const fee = Math.min(400, g.profile.cash);
    g.profile.cash -= fee;
    g.result = `응급 구조 비용 ${fee} C. 은신처에서 다시 시작합니다.`;
  } else {
    g.profile.deaths++;
    g.profile.history.unshift(
      `#${String(g.profile.generation).padStart(3, '0')} 영구 퇴장`,
    );
    g.profile.generation++;
    g.result =
      reason ||
      '이번 참가자는 돌아오지 못했습니다. 조직은 다음 인물을 준비합니다.';
  }
  g.profile.history = g.profile.history.slice(0, 8);
  return true;
}
export function shoot(g, target) {
  const p = g.player;
  if (g.status !== 'playing' || p.reload > 0 || p.shotCooldown > 0 || p.carId)
    return false;
  if (p.ammo <= 0) {
    reload(g);
    return false;
  }
  p.ammo--;
  p.shotCooldown = 0.18;
  p.angle = Math.atan2(target.x - p.x, target.z - p.z);
  if (g.signal === 'red' && g.phase === 'debt') violateSignal(g);
  const dx = Math.sin(p.angle),
    dz = Math.cos(p.angle),
    endpoint = { x: p.x + dx * 65, z: p.z + dz * 65 };
  let victim = null,
    best = 65;
  for (const n of g.npcs) {
    if (!n.alive) continue;
    const t = (n.x - p.x) * dx + (n.z - p.z) * dz;
    const side = Math.abs((n.x - p.x) * dz - (n.z - p.z) * dx);
    if (t > 0 && t < best && side < 1.35 && lineClear(p, n)) {
      victim = n;
      best = t;
    }
  }
  if (victim) {
    victim.hp -= 36;
    victim.hostile = true;
    endpoint.x = victim.x;
    endpoint.z = victim.z;
    if (victim.id === 'ally' && g.pact) {
      g.pact = false;
      g.allyTrust = -2;
      note(g, '윤서: “결국 당신도 똑같군요.” · 동맹 파기', 'warning');
    }
    if (victim.hp <= 0) killNpc(g, victim);
  }
  g.bullets.push({
    x: p.x,
    z: p.z,
    tx: endpoint.x,
    tz: endpoint.z,
    life: 0.09,
    enemy: false,
  });
  g.wanted = Math.min(3, g.wanted + 0.12);
  return true;
}
function killNpc(g, n) {
  if (!n.alive) return;
  n.alive = false;
  g.kills++;
  if (n.certificates > 0)
    g.crates.push({
      id: `drop-${n.id}`,
      x: n.x,
      z: n.z,
      value: n.certificates,
      cash: 150,
      taken: false,
      cooldown: 0,
    });
  note(
    g,
    `${n.name} 탈락${n.certificates ? ' · 소지 증서가 떨어졌습니다' : ''}`,
    'warning',
  );
}
function violateSignal(g) {
  if (g.signalHit > 0) return;
  g.signalHit = 2;
  g.wanted = 3;
  note(g, '금지 행동 감지 · 규칙 위반 −25 HP', 'warning');
  damage(g, 25, '적색 신호의 금지 행동으로 탈락했습니다.');
}
function moveNpc(g, n, target, speed, dt) {
  const d = distance(n, target);
  if (d < 0.7) return;
  n.angle = Math.atan2(target.x - n.x, target.z - n.z);
  const dx = ((target.x - n.x) / d) * speed * dt,
    dz = ((target.z - n.z) / d) * speed * dt;
  const old = { x: n.x, z: n.z };
  moveBody(n, dx, dz);
  if (distance(n, old) < speed * dt * 0.35) moveBody(n, -dz * 1.4, dx * 1.4);
}
export function step(g, dt, input = {}) {
  if (g.status !== 'playing') return;
  dt = clamp(dt, 0, 0.05);
  if (!dt) return;
  const p = g.player;
  g.elapsed += dt;
  g.phaseElapsed += dt;
  g.lastDamage = Math.max(0, g.lastDamage - dt);
  g.signalHit = Math.max(0, g.signalHit - dt);
  p.shotCooldown = Math.max(0, p.shotCooldown - dt);
  if (p.reload > 0) {
    p.reload -= dt;
    if (p.reload <= 0) {
      const n = Math.min(24 - p.ammo, p.reserve);
      p.ammo += n;
      p.reserve -= n;
      p.reload = 0;
    }
  }
  if (g.phase !== 'city') {
    g.time = Math.max(0, g.time - dt);
    if (g.time <= 0) {
      finish(g, false, '제한 시간 안에 목표를 완료하지 못했습니다.');
      return;
    }
  }
  if (g.phase === 'debt') {
    const cycle = g.phaseElapsed % 35;
    const next = cycle < 25 ? 'green' : cycle < 28 ? 'amber' : 'red';
    g.signalRemaining = Math.ceil(
      (next === 'green' ? 25 : next === 'amber' ? 28 : 35) - cycle,
    );
    if (next !== g.signal) {
      g.signal = next;
      note(
        g,
        next === 'red'
          ? '적색 신호. 추진·조향·발포를 멈추세요. 제동은 허용됩니다.'
          : next === 'amber'
            ? '3초 후 적색 신호. 이동을 멈추세요.'
            : '녹색 신호. 이동할 수 있습니다.',
        next === 'green' ? 'info' : 'warning',
      );
    }
  }
  if (g.phase === 'power') {
    const cycle = g.phaseElapsed % 70,
      next = cycle >= 50;
    if (cycle >= 45 && cycle < 50 && !g.blackoutWarned) {
      g.blackoutWarned = true;
      note(
        g,
        'VIP 개입: 5초 후 도시 조명 차단. 발전소 표식은 유지됩니다.',
        'broadcast',
      );
    }
    if (cycle < 45) g.blackoutWarned = false;
    if (next !== g.blackout) {
      g.blackout = next;
      note(
        g,
        next ? 'VIP 개입 · 도시 정전 20초' : '도시 조명 복구',
        'broadcast',
      );
    }
  }
  const moving = Math.abs(input.forward || 0) + Math.abs(input.right || 0) > 0;
  if (p.carId) {
    const c = g.cars.find((c) => c.id === p.carId),
      throttle = input.forward || 0,
      steering = input.right || 0;
    if (
      g.signal === 'red' &&
      g.phase === 'debt' &&
      (throttle > 0 || steering !== 0 || (throttle < 0 && c.speed <= 0))
    )
      violateSignal(g);
    if (g.status !== 'playing') return;
    c.speed += throttle * 23 * dt;
    c.speed *= Math.pow(throttle ? 0.992 : 0.965, dt * 60);
    c.speed = clamp(c.speed, -11, input.sprint ? 44 : 32);
    c.angle -=
      steering *
      1.6 *
      dt *
      clamp(Math.abs(c.speed) / 8, 0, 1) *
      (c.speed < 0 ? -1 : 1);
    const dx = Math.sin(c.angle) * c.speed * dt,
      dz = Math.cos(c.angle) * c.speed * dt;
    if (blocked(c.x + dx, c.z + dz, 1.8)) {
      c.hp -= Math.abs(c.speed) * 0.35;
      c.speed *= -0.18;
    } else {
      c.x += dx;
      c.z += dz;
    }
    p.x = c.x;
    p.z = c.z;
    p.angle = c.angle;
    for (const n of g.npcs)
      if (n.alive && distance(c, n) < 2.5 && Math.abs(c.speed) > 10) {
        n.hp -= 120;
        killNpc(g, n);
        c.speed *= 0.75;
        g.wanted = Math.min(3, g.wanted + 0.5);
      }
    if (c.hp <= 0) {
      c.hp = 0;
      c.speed = 0;
      p.carId = null;
      const safe = [
        [3, 0],
        [-3, 0],
        [0, 4],
        [0, -4],
      ].find(([x, z]) => !blocked(p.x + x, p.z + z));
      if (safe) {
        p.x += safe[0];
        p.z += safe[1];
      }
      damage(g, 20, '차량 파손으로 탈락했습니다.');
      note(g, '차량 파손 · 하차 후 다른 차량을 확보하세요.', 'warning');
    }
  } else {
    if (moving && g.signal === 'red' && g.phase === 'debt') violateSignal(g);
    if (g.status !== 'playing') return;
    const yaw = input.yaw || 0,
      f = input.forward || 0,
      r = input.right || 0,
      norm = Math.max(1, Math.hypot(f, r));
    const sprint = input.sprint && p.stamina > 1 && moving,
      speed = sprint ? 13 : 8;
    const dx = ((r * Math.cos(yaw) - f * Math.sin(yaw)) / norm) * speed * dt,
      dz = ((-r * Math.sin(yaw) - f * Math.cos(yaw)) / norm) * speed * dt;
    moveBody(p, dx, dz);
    p.stamina = clamp(p.stamina + (sprint ? -24 : 16) * dt, 0, 100);
    if (moving && !input.aiming) p.angle = Math.atan2(dx, dz);
  }
  g.wanted = Math.max(0, g.wanted - dt * 0.022);
  for (const c of g.crates)
    if (g.phase === 'city' && c.taken && c.cooldown > 0) {
      c.cooldown -= dt;
      if (c.cooldown <= 0) c.taken = false;
    }
  for (const n of g.npcs) {
    if (!n.alive) continue;
    n.cooldown -= dt;
    if (n.role === 'ally' && g.pact) {
      if (distance(n, p) > (p.carId ? 5 : 3))
        moveNpc(
          g,
          n,
          p,
          p.carId
            ? Math.max(12, Math.abs(g.cars.find((c) => c.id === p.carId).speed))
            : 10,
          dt,
        );
      const enemy = g.npcs.find(
        (e) =>
          e.alive &&
          e.role === 'guard' &&
          distance(e, n) < 25 &&
          lineClear(n, e),
      );
      if (enemy && n.cooldown <= 0) {
        enemy.hp -= 25;
        n.cooldown = 1;
        g.bullets.push({
          x: n.x,
          z: n.z,
          tx: enemy.x,
          tz: enemy.z,
          life: 0.13,
          ally: true,
        });
        if (enemy.hp <= 0) killNpc(g, enemy);
      }
      continue;
    }
    const aggro =
      n.role === 'guard'
        ? g.wanted > 0.7 || g.phase !== 'city'
        : n.hostile && g.phase !== 'city';
    const d = distance(n, p);
    if (aggro && d < 48) {
      if (d > 15) moveNpc(g, n, p, n.role === 'guard' ? 5 : 6, dt);
      if (d < 30 && n.cooldown <= 0 && lineClear(n, p)) {
        n.cooldown = 2.1 + (n.role === 'rival' ? 0.9 : 0);
        n.angle = Math.atan2(p.x - n.x, p.z - n.z);
        let target = p;
        const ally = g.npcs.find((a) => a.id === 'ally' && a.alive);
        if (g.pact && ally && distance(n, ally) < d && lineClear(n, ally))
          target = ally;
        g.bullets.push({
          x: n.x,
          z: n.z,
          tx: target.x,
          tz: target.z,
          life: 0.12,
          enemy: true,
        });
        if (target === ally) {
          ally.hp -= 7;
          if (ally.hp <= 0) killNpc(g, ally);
        } else if (p.carId) {
          const c = g.cars.find((c) => c.id === p.carId);
          c.hp -= 6;
        } else damage(g, n.role === 'guard' ? 7 : 5);
      }
    } else if (n.role !== 'ally') {
      if (!n.target || distance(n, n.target) < 3) {
        const road = Math.round(n.x / 60) * 60;
        n.target = {
          x: clamp(road, -120, 120),
          z: Math.sin(g.elapsed * 0.09 + Number(n.id.split('-')[1]) * 2) * 120,
        };
      }
      moveNpc(g, n, n.target, 2.4, dt);
    }
    if (g.status !== 'playing') break;
  }
  g.bullets = g.bullets.filter((b) => (b.life -= dt) > 0);
  g.interaction = interactionFor(g);
}
export function objective(g) {
  if (g.phase === 'city')
    return {
      title: '당신의 도시, 당신의 규칙',
      text: '밀수품으로 자금을 모으거나 등록소에서 대회에 참가하세요.',
      target: PLACES.gate,
      progress: 0,
    };
  if (g.phase === 'debt') {
    const target =
      g.player.certificates >= 100
        ? PLACES.bank
        : g.crates
            .filter((c) => !c.taken)
            .sort((a, b) => distance(a, g.player) - distance(b, g.player))[0];
    return {
      title: '01 / 연대채무',
      text:
        g.player.certificates >= 100
          ? '중앙 상환소에 증서 100을 납부하세요.'
          : '도시의 보관함에서 증서 100을 확보하세요.',
      target: target
        ? {
            ...target,
            label: g.player.certificates >= 100 ? '채무 상환소' : '증서 보관함',
          }
        : PLACES.bank,
      progress: Math.min(100, g.player.certificates),
    };
  }
  if (g.phase === 'power') {
    const target = PLANTS.filter((p) => !g.activated.includes(p.id)).sort(
      (a, b) => distance(a, g.player) - distance(b, g.player),
    )[0];
    return {
      title: '02 / 도시의 심장',
      text: `도시의 전력망을 복구하세요. ${g.activated.length} / 3`,
      target,
      progress: (g.activated.length / 3) * 100,
    };
  }
  return {
    title: '03 / 마지막 배당',
    text: '북동쪽 항만의 회수 차량에 탑승하세요.',
    target: PLACES.exit,
    progress: 100,
  };
}
