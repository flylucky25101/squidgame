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
  assert.ok(
    s.crowd.every((n) => n.z >= s.z),
    'nobody starts ahead of the player',
  );
  assert.ok(
    s.crowd.every((n) => !n.blocker),
    'no stationary NPC barricades',
  );
});

test('opening field allows a straight route when moving only during the chant', () => {
  const s = playing(0);
  for (let i = 0; i < 15000 && s.status === 'playing'; i++)
    tick(s, 0.016, s.light === 'green' ? { z: -1 } : {});
  assert.equal(s.status, 'won', s.message);
  assert.ok(Math.abs(s.x) < 2, 'no forced zigzag detour');
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
  assert.equal(s.progress, 10);
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
              [3.7, 0, -2],
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
