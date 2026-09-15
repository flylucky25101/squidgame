import test from 'node:test';
import assert from 'node:assert/strict';
import { newRun, beginRound, tick } from '../app/arena/rules.js';
import { challengeAction as act, ROADBLOCKS } from '../app/arena/adventure.js';
const run = (r) => {
  const s = newRun(r, false, () => 0.5);
  beginRound(s);
  return s;
};
const advance = (s, t, input = {}) => {
  for (let i = 0; i < t / 0.016; i++) tick(s, 0.016, input);
};
test('blackout storage blocks movement and lamp toggles', () => {
  const s = run(1);
  s.challenge.x = -8;
  s.challenge.z = 16;
  advance(s, 2, { z: -1 });
  assert.ok(s.challenge.z > 14.6);
  act(s, 'primary');
  assert.equal(s.challenge.flash, false);
});
test('blackout collecting cells alone does not finish away from exit', () => {
  const s = run(1);
  s.challenge.cells = [0, 1, 2];
  tick(s, 0.016);
  assert.equal(s.status, 'playing');
  s.challenge.x = 0;
  s.challenge.z = -29;
  tick(s, 0.016);
  assert.equal(s.status, 'won');
});
test('blackout outer stealth route collects all cells and escapes with real movement', () => {
  const s = run(1);
  act(s, 'primary');
  for (const [x, z] of [
    [-15, 24],
    [-15, 4],
    [-12, 4],
    [-15, 0],
    [15, 0],
    [15, -8],
    [12, -8],
    [15, -24],
    [-12, -24],
    [-12, -21],
    [0, -25],
    [0, -29],
  ]) {
    let frames = 0;
    while (
      s.status === 'playing' &&
      Math.hypot(x - s.challenge.x, z - s.challenge.z) > 0.15 &&
      frames++ < 3000
    )
      tick(s, 0.016, { x: x - s.challenge.x, z: z - s.challenge.z });
    assert.ok(frames < 3000, 'route must not get stuck');
  }
  assert.equal(s.status, 'won', s.message);
  assert.equal(s.challenge.cells.length, 3);
});
test('factory side route can be completed without hazard teleporting', () => {
  const s = run(3);
  advance(s, 1, { x: 1 });
  advance(s, 18, { z: -1 });
  assert.equal(s.status, 'won', s.message);
});
test('factory walking into gap falls while jumping crosses', () => {
  const s = run(3);
  s.challenge.z = 17.8;
  advance(s, 0.15, { z: -1 });
  assert.equal(s.status, 'dying');
  const j = run(3);
  j.challenge.z = 17;
  act(j, 'primary');
  advance(j, 0.75, { z: -1 });
  assert.equal(j.status, 'playing');
  assert.ok(j.challenge.z > 21);
});
test('vehicle collision costs durability once and boost consumes fuel', () => {
  const s = run(5);
  s.challenge.x = ROADBLOCKS[0].x;
  s.challenge.z = ROADBLOCKS[0].z;
  tick(s, 0.016);
  assert.equal(s.challenge.health, 76);
  tick(s, 0.016);
  assert.equal(s.challenge.health, 76);
  act(s, 'primary');
  assert.ok(s.challenge.fuel < 80);
  assert.ok(s.challenge.boost > 0);
});
test('vehicle obstacle avoidance and boost can reach escape', () => {
  const s = run(5);
  let i = 0;
  while (s.status === 'playing' && i++ < 10000) {
    const c = s.challenge;
    const obstacle = ROADBLOCKS.find((b) => b.z > c.z - 3 && b.z < c.z + 25);
    let target = obstacle ? (obstacle.x <= 0 ? 6 : -6) : 6;
    if (c.z > 270 && c.z < 340) target = 6;
    if (c.boost === 0 && c.fuel >= 25) act(s, 'primary');
    tick(s, 0.016, { x: Math.max(-1, Math.min(1, target - c.x)) });
  }
  assert.equal(s.status, 'won', s.message);
});
test('new adventures ignore input after death or while ready', () => {
  for (const r of [1, 3, 5]) {
    const s = newRun(r);
    const old = JSON.stringify(s.challenge);
    act(s, 'primary');
    tick(s, 0.016, { x: 1, z: -1 });
    assert.equal(JSON.stringify(s.challenge), old);
  }
});
