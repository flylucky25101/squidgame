import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  startFirstDelivery,
  interact,
  PLACES,
  enterCar,
  sanitizeProfile,
  startTournament,
  step,
  damage,
  shoot,
  lineClear,
} from '../app/game/model.js';
const game = () => {
  const g = createGame({}, 42);
  g.status = 'playing';
  return g;
};
const at = (g, p) => Object.assign(g.player, { x: p.x, z: p.z });
test('first delivery requires pickup and a stopped vehicle, and pays once across reloads', () => {
  const g = game();
  assert(startFirstDelivery(g));
  assert.equal(startFirstDelivery(g), false);
  at(g, PLACES.home);
  interact(g);
  assert.equal(g.profile.firstDeliveryDone, false);
  const crate = g.crates.find((c) => c.id === g.firstDelivery.crateId);
  at(g, crate);
  interact(g);
  assert.equal(g.firstDelivery.stage, 'return');
  const cash = g.profile.cash;
  at(g, PLACES.home);
  assert.equal(interact(g), false);
  at(g, g.cars[0]);
  enterCar(g);
  at(g, PLACES.home);
  g.cars[0].speed = 8;
  assert.equal(interact(g), false);
  g.cars[0].speed = 0;
  assert(interact(g));
  assert.equal(g.profile.cash, cash + 1000);
  assert.equal(g.profile.firstDeliveryDone, true);
  interact(g);
  assert.equal(g.profile.cash, cash + 1000);
  const next = createGame(sanitizeProfile(g.profile));
  assert.equal(startFirstDelivery(next), false);
});
test('entering a tournament cancels the delivery without awarding it', () => {
  const g = game();
  startFirstDelivery(g);
  const cash = g.profile.cash;
  startTournament(g);
  assert.equal(g.firstDelivery, null);
  assert.equal(g.profile.cash, cash);
  assert.equal(startFirstDelivery(g), false);
});
test('enemy wind-up warns before firing and cover cancels a pending shot', () => {
  const g = game();
  startTournament(g);
  g.phase = 'power';
  g.npcs = g.npcs.filter((n) => n.role === 'guard').slice(0, 1);
  const n = g.npcs[0];
  Object.assign(n, { x: 0, z: 10, cooldown: 0 });
  at(g, { x: 0, z: 25 });
  step(g, 0.05);
  assert(n.aimUntil > g.elapsed);
  assert.equal(g.player.hp, 100);
  for (let i = 0; i < 10; i++) step(g, 0.05);
  assert.equal(g.player.hp, 100);
  for (let i = 0; i < 5; i++) step(g, 0.05);
  assert.equal(g.player.hp, 93);
  assert.equal(g.incoming.x, n.x);
  n.cooldown = 0;
  step(g, 0.05);
  assert(n.aimUntil);
  at(g, { x: 40, z: 25 });
  assert.equal(lineClear(n, g.player), false);
  step(g, 0.05);
  assert.equal(n.aimUntil, null);
});
test('hits give short confirmation and fatal rule damage gives a specific retry tip', () => {
  const g = game();
  const n = g.npcs[0];
  g.npcs = [n];
  Object.assign(n, { x: 0, z: 12, hp: 30 });
  at(g, { x: 0, z: 25 });
  shoot(g, n);
  assert.equal(g.hitFeedback.killed, true);
  assert.equal(g.hitFeedback.until, 0.3);
  const h = game();
  startTournament(h);
  damage(h, 100, '적색 위반', null, 'rule');
  assert.equal(h.defeatCause, '적색 위반');
  assert.match(h.defeatTip, /황색/);
});
test('timeout guidance reflects the failed phase', () => {
  const g = game();
  startTournament(g);
  g.phase = 'power';
  g.time = 0.01;
  step(g, 0.05);
  assert.match(g.defeatCause, /시간/);
  assert.match(g.defeatTip, /변전소/);
});
