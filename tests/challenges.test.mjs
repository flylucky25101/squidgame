import test from 'node:test';
import assert from 'node:assert/strict';
import { newRun, beginRound, tick } from '../app/arena/rules.js';
import { challengeAction as act } from '../app/arena/challenges.js';
const run = (r) => {
  const s = newRun(r, false, () => 0.5);
  beginRound(s);
  return s;
};
const advance = (s, t, input = {}) => {
  for (let i = 0; i < t / 0.01; i++) tick(s, 0.01, input);
};
test('mingle requires exact headcount and an empty room through three rounds', () => {
  const s = run(1),
    c = s.challenge;
  for (let i = 0; i < 3; i++) {
    advance(s, 3.1);
    assert.equal(c.phase, 'choose');
    const room = c.rooms.findIndex((n) => n === c.target);
    act(s, 'room', room);
    assert.equal(c.phase, 'choose');
    for (let j = 0; j < c.target - 1; j++) act(s, 'person', j);
    act(s, 'room', room);
    assert.equal(c.phase, 'safe');
    advance(s, 1.6);
  }
  assert.equal(s.status, 'won');
});
test('mingle deadline eliminates and cannot accept late input', () => {
  const s = run(1);
  advance(s, 17);
  assert.equal(s.status, 'dying');
  const team = s.challenge.team.length;
  act(s, 'person', 0);
  assert.equal(s.challenge.team.length, team);
});
test('gonggi five stages require exact groups and a descending catch', () => {
  const s = run(3),
    c = s.challenge;
  for (const groups of [[1, 1, 1, 1], [2, 2], [3, 1], [4], [0]]) {
    let id = 0;
    for (const n of groups) {
      act(s, 'toss');
      for (let j = 0; j < n; j++) act(s, 'stone', id++);
      advance(s, 1.1);
      act(s, 'catch');
    }
  }
  assert.equal(s.status, 'won');
  assert.equal(c.stage, 5);
});
test('gonggi premature catch and dropped stone reset only current stage', () => {
  const s = run(3);
  act(s, 'toss');
  act(s, 'catch');
  assert.equal(s.challenge.misses, 1);
  act(s, 'toss');
  advance(s, 2);
  assert.equal(s.challenge.misses, 2);
  assert.equal(s.status, 'playing');
});
test('jump rope punishes walking into sweep and allows timed crossing with gaps', () => {
  const fail = run(5);
  advance(fail, 2, { forward: true });
  assert.equal(fail.status, 'dying');
  const s = run(5);
  let i = 0;
  while (s.status === 'playing' && i++ < 20000) {
    const c = s.challenge;
    const atGap = c.distance > 17.6 && c.distance < 18.3;
    if (c.jump === 0 && c.phase > 0.3 && c.phase < 0.4) act(s, 'jump');
    tick(s, 0.01, { forward: !atGap || c.jump > 0.75 });
  }
  assert.equal(s.status, 'won', s.message);
  assert.ok(s.challenge.clears > 3);
});
test('straight movement remains blocked by crowd even with a permanently safe signal', () => {
  const s = run(0);
  for (let i = 0; i < 3000; i++) {
    s.chantTime = 0;
    tick(s, 0.016, { z: -1 });
  }
  assert.equal(s.status, 'playing');
  assert.ok(s.z > 0);
});
