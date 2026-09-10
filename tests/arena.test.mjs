import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {
  newRun,
  tick,
  act,
  signal,
  shapePoints,
  chooseShape,
  traceAt,
  joystickVector,
  insideSquid,
  beginRound,
  throwStone,
} from '../app/arena/rules.js';
import { cameraPose } from '../app/arena/visuals.js';
const playing = (r) =>
  Object.assign(
    newRun(r, false, () => 0.5),
    { status: 'playing' },
  );
const frames = (s, n, input = {}) => {
  for (let i = 0; i < n; i++) tick(s, 0.016, input);
};
test('456 distinct contestants and 5 minute opening limit', () => {
  const s = newRun();
  assert.equal(s.crowd.length + 1, 456);
  assert.equal(new Set(s.crowd.map((n) => `${n.x}:${n.z}`)).size, 455);
  assert.equal(s.time, 300);
});
test('red movement starts a slow death sequence, standing is safe', () => {
  const s = playing(0);
  s.light = 'red';
  s.lightRemaining = 3;
  tick(s, 0.02);
  assert.equal(s.status, 'playing');
  tick(s, 0.02, { z: -1 });
  assert.equal(s.status, 'dying');
  assert.equal(s.shotId, 1);
  frames(s, 100);
  assert.equal(s.status, 'dying');
  frames(s, 210);
  assert.equal(s.status, 'lost');
});
test('chant ends before the doll turns and clear finish wins', () => {
  const s = playing(0);
  s.chantTime = s.chant.reduce((a, b) => a + b, 0) - 0.01;
  tick(s, 0.02);
  assert.equal(signal(s), 'turning');
  frames(s, 80);
  assert.equal(signal(s), 'red');
  s.light = 'green';
  s.chantTime = 0;
  s.lightRemaining = 2;
  s.z = -33.1;
  tick(s, 0.02);
  assert.equal(s.status, 'won');
});
test('player resolves overlap with a crowd member and moving direction faces forward', () => {
  const s = playing(0);
  s.x = s.crowd[0].x;
  s.z = s.crowd[0].z;
  tick(s, 0.016, { z: -1 });
  const n = s.crowd[0];
  assert.ok(Math.hypot(s.x - n.x, s.z - n.z) >= 0.99);
  assert.equal(Math.abs(s.heading), Math.PI);
});
test('red-light bystander panic does not displace or kill a stationary player', () => {
  const s = playing(0);
  s.light = 'red';
  s.lightRemaining = 5;
  s.nextEvent = 0;
  const x = s.x,
    z = s.z;
  tick(s, 0.02);
  assert.equal(s.status, 'playing');
  assert.equal(s.x, x);
  assert.equal(s.z, z);
  assert.equal(s.crowd.filter((n) => !n.alive).length, 1);
});
test('all four sugar shapes have distinct traces and can be completed', () => {
  const signatures = new Set();
  for (let shape = 0; shape < 4; shape++) {
    const s = newRun(1);
    chooseShape(s, shape);
    signatures.add(JSON.stringify(s.trace));
    s.status = 'playing';
    for (const [x, y] of s.trace) traceAt(s, x, y);
    assert.equal(s.status, 'won');
  }
  assert.equal(signatures.size, 4);
});
test('sugar cannot skip to a far endpoint and scratching breaks it', () => {
  const s = playing(1);
  for (let i = 0; i < 3; i++) traceAt(s, 3, 3);
  assert.equal(s.status, 'dying');
  assert.equal(s.progress, 0);
});
test('rope rewards timing and ignores instant repeat taps', () => {
  const s = playing(2);
  act(s, 0);
  const f = s.force;
  act(s, 0);
  assert.equal(s.force, f);
  for (let i = 1; i < 12; i++) {
    s.elapsed = (i * Math.PI) / 3;
    act(s, 0);
  }
  assert.equal(s.status, 'won');
  frames(s, 100);
  assert.ok(s.resultTime > 1.5);
});
test('centered medium stone swipe knocks target down before winning', () => {
  const s = playing(3);
  throwStone(s, 0, -0.4, 0.5);
  frames(s, 180);
  assert.equal(s.status, 'won');
  assert.equal(s.stoneHit, true);
});
test('missed stone requires retrieval and repeat input cannot spawn more stones', () => {
  const s = playing(3);
  throwStone(s, 0.4, -0.4, 0.5);
  throwStone(s, 0, -0.4, 0.5);
  assert.equal(s.attempts, 1);
  frames(s, 700);
  assert.equal(s.status, 'playing');
  assert.equal(s.retrieveTime, 0);
  throwStone(s, 0, -0.4, 0.5);
  frames(s, 180);
  assert.equal(s.status, 'won');
});

test('random sugar opening pauses clock and blocks tracing until reveal completes', () => {
  for (let shape = 0; shape < 4; shape++) {
    const s = newRun(1, false, () => (shape + 0.1) / 4);
    beginRound(s);
    assert.equal(s.shape, shape);
    assert.equal(s.status, 'opening');
    const time = s.time;
    traceAt(s, 3, 3);
    frames(s, 100);
    assert.equal(s.time, time);
    frames(s, 80);
    assert.equal(s.status, 'playing');
  }
});
test('bridge preview blocks choices and each safe landing advances once', () => {
  const s = playing(4);
  act(s, 1 - s.bridge[0]);
  assert.equal(s.jump, null);
  s.elapsed = 10;
  for (const v of s.bridge) {
    act(s, v);
    act(s, v);
    frames(s, 35);
  }
  assert.equal(s.progress, 18);
  assert.equal(s.status, 'won');
});
test('unassisted bridge allows immediate play; wrong pane shatters after landing', () => {
  const s = playing(4);
  s.memory = false;
  act(s, 1 - s.bridge[0]);
  assert.equal(s.status, 'playing');
  frames(s, 35);
  assert.equal(s.status, 'dying');
  assert.equal(s.deathKind, 'fall');
  assert.equal(s.broken, 0);
});
test('squid cannot win before neck and entrance; court uses actual polygon', () => {
  const s = playing(5);
  s.x = 0;
  s.z = -21;
  tick(s, 0.01);
  assert.notEqual(s.status, 'won');
  assert.equal(insideSquid(8, -15), false);
  assert.equal(insideSquid(8, 10), true);
});
test('squid neck knockback cannot trap player outside the narrow passage', () => {
  const s = playing(5);
  s.x = 0;
  s.z = 1.95;
  s.neckEntered = true;
  s.defenderWindup = 0.01;
  tick(s, 0.016);
  assert.ok(s.z <= 2);
  const z = s.z;
  frames(s, 15, { z: -1 });
  assert.ok(s.z < z);
});
test('squid correct route walks neck, exterior, entrance, then wins at the head', () => {
  const s = playing(5);
  s.opponentStun = 1000;
  const walk = (x, z, n = 3000) => {
    let i = 0;
    while (
      Math.hypot(s.x - x, s.z - z) > 0.13 &&
      i++ < n &&
      s.status === 'playing'
    ) {
      const dx = x - s.x,
        dz = z - s.z,
        d = Math.hypot(dx, dz);
      tick(s, 0.016, { x: dx / d, z: dz / d });
    }
    assert.ok(i < n, `blocked at ${s.x},${s.z}, ${s.squidStage}`);
  };
  walk(12, 0);
  assert.equal(s.squidStage, 'entrance');
  walk(12, 26);
  walk(0, 26);
  walk(0, 23);
  assert.equal(s.squidStage, 'attack');
  walk(0, -21);
  assert.equal(s.status, 'won');
});
test('squid leaving court after entrance eliminates player', () => {
  const s = playing(5);
  s.squidStage = 'attack';
  s.x = 10.1;
  s.z = 10;
  tick(s, 0.016);
  assert.equal(s.status, 'dying');
});
test('joystick bounds diagonal speed and suppresses small accidental movement', () => {
  assert.deepEqual(joystickVector(2, 2), { x: 0, z: 0 });
  const v = joystickVector(100, -100);
  assert.ok(Math.abs(Math.hypot(v.x, v.z) - 1) < 1e-9);
  assert.ok(v.x > 0 && v.z < 0);
});
test('overview camera includes the opening crowd and all bridge panes in portrait and landscape', () => {
  for (const aspect of [0.46, 0.75, 1.77, 2.2])
    for (const round of [0, 4]) {
      const s = playing(round),
        pose = cameraPose(s, aspect, true),
        c = new T.PerspectiveCamera(53, aspect, 0.1, 350);
      c.position.set(...pose.position);
      c.lookAt(...pose.look);
      c.updateMatrixWorld();
      const points =
        round === 0
          ? [
              [-28, 0, 6],
              [28, 0, 6],
              [-28, 0, 43],
              [28, 0, 43],
              [0, 2, 44],
            ]
          : [
              [-3.7, 0, 34],
              [3.7, 0, -34],
            ];
      for (const p of points) {
        const v = new T.Vector3(...p).project(c);
        assert.ok(
          Math.abs(v.x) < 1 && Math.abs(v.y) < 1,
          `round ${round} aspect ${aspect}: ${v.x},${v.y}`,
        );
      }
    }
});
test('all six rounds settle only once after timeout', () => {
  for (let r = 0; r < 6; r++) {
    const s = playing(r);
    s.time = 0.001;
    tick(s, 0.05);
    assert.equal(s.status, 'dying');
    frames(s, 310);
    assert.equal(s.status, 'lost');
    const id = s.shotId;
    tick(s, 0.05);
    assert.equal(s.shotId, id);
  }
});
