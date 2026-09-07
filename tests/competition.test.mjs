import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  startTournament,
  step,
  certificateLedger,
  moveNpc,
  distance,
  blocked,
  enterCar,
  shoot,
} from '../app/game/model.js';
function game() {
  const g = createGame({}, 42);
  g.status = 'playing';
  startTournament(g);
  return g;
}
test('rivals conserve the 600 certificates while collecting and paying', () => {
  const g = game();
  g.npcs = g.npcs.filter((n) => n.role === 'rival');
  g.player.x = 140;
  g.player.z = 140;
  for (let i = 0; i < 2400 && g.status === 'playing'; i++) {
    step(g, 0.05);
    const l = certificateLedger(g);
    assert.equal(l.available + l.paid, 600);
  }
  assert(g.npcs.some((n) => n.qualified));
  assert(certificateLedger(g).paid >= 100);
});
test('rivals stop during red signal', () => {
  const g = game();
  g.npcs = g.npcs.filter((n) => n.role === 'rival');
  g.phaseElapsed = 28;
  const before = g.npcs.map((n) => ({ x: n.x, z: n.z }));
  step(g, 0.05);
  g.npcs.forEach((n, i) => assert.equal(distance(n, before[i]), 0));
});
test('navigation reaches target around solid buildings without entering them', () => {
  const g = game(),
    n = { x: 0, z: 30 },
    target = { x: 60, z: 30 };
  for (let i = 0; i < 1500 && distance(n, target) > 1; i++) {
    moveNpc(g, n, target, 6, 0.05);
    assert(!blocked(n.x, n.z));
  }
  assert(distance(n, target) < 1);
});
test('held red braking stops without reverse or penalty', () => {
  const g = game();
  g.npcs = [];
  Object.assign(g.player, { x: g.cars[0].x, z: g.cars[0].z });
  enterCar(g);
  g.cars[0].speed = 1;
  g.phaseElapsed = 28;
  for (let i = 0; i < 60; i++) step(g, 0.05, { forward: -1 });
  assert.equal(g.cars[0].speed, 0);
  assert.equal(g.player.hp, 100);
});
test('passenger travels safely and exits with the player', () => {
  const g = game();
  const ally = g.npcs.find((n) => n.role === 'ally');
  g.npcs = [ally];
  g.pact = true;
  Object.assign(g.player, { x: g.cars[0].x, z: g.cars[0].z });
  Object.assign(ally, { x: g.player.x, z: g.player.z });
  enterCar(g);
  assert.equal(ally.carId, g.player.carId);
  for (let i = 0; i < 20; i++) step(g, 0.05, { forward: 1 });
  assert.equal(ally.hp, 120);
  assert.equal(distance(ally, g.player), 0);
  g.cars[0].speed = 0;
  enterCar(g);
  assert.equal(ally.carId, null);
  assert(distance(ally, g.player) < 5);
});
test('fatal rule violation cannot shoot after settlement', () => {
  const g = game();
  g.player.hp = 25;
  g.signal = 'red';
  const n = g.npcs[0];
  const hp = n.hp;
  shoot(g, n);
  assert.equal(g.status, 'finished');
  assert.equal(n.hp, hp);
  assert.equal(g.bullets.length, 0);
});
test('eliminated carriers drop their certificates once', () => {
  const g = game();
  const n = g.npcs[0];
  g.npcs = [n];
  g.crates[0].taken = true;
  n.certificates = 25;
  n.hp = 30;
  Object.assign(g.player, { x: 0, z: 25 });
  Object.assign(n, { x: 0, z: 15 });
  shoot(g, n);
  assert.equal(n.alive, false);
  assert.equal(n.certificates, 0);
  assert.equal(g.crates.filter((c) => c.id === `drop-${n.id}`).length, 1);
  assert.equal(certificateLedger(g).available, 600);
  g.player.shotCooldown = 0;
  shoot(g, n);
  assert.equal(certificateLedger(g).available, 600);
});
test('unrecoverable certificate shortage settles the match only once', () => {
  const g = game();
  g.npcs = [];
  g.crates.forEach((c) => {
    c.taken = true;
  });
  g.player.certificates = 99;
  step(g, 0.05);
  step(g, 0.05);
  assert.equal(g.status, 'finished');
  assert.equal(g.profile.deaths, 1);
  assert.match(g.result, /부족/);
});
