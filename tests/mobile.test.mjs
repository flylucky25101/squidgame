import test from 'node:test';
import assert from 'node:assert/strict';
import { joystickVector, visibleNotes } from '../app/game/mobile.js';
import { createGame, note, startTournament } from '../app/game/model.js';
import { CityEngine } from '../app/game/engine.js';
test('joystick dead zone, diagonals and reverse stay bounded', () => {
  assert.deepEqual(joystickVector(1, 2), { x: 0, y: 0 });
  assert.equal(joystickVector(0, -48).y, 1);
  assert.equal(joystickVector(0, 48).y, -1);
  const v = joystickVector(100, 100);
  assert(Math.abs(Math.hypot(v.x, v.y) - 1) < 1e-9);
  assert.equal(joystickVector(24, 0).x, 0.5);
});
test('ordinary alerts expire in 3.5 seconds and broadcasts in 6.5 seconds', () => {
  const g = createGame();
  g.notes = [];
  note(g, '차량에서 내렸습니다.');
  const expiry = g.notes[0].expiresAt;
  assert.equal(visibleNotes(g.notes, expiry - 1).length, 1);
  assert.equal(visibleNotes(g.notes, expiry).length, 0);
  note(g, '규칙 안내', 'broadcast');
  assert(g.notes[0].expiresAt >= expiry + 3000);
});
test('practice advances through actions and ends when entering a tournament', () => {
  const e = Object.create(CityEngine.prototype);
  e.game = createGame();
  e.yaw = 0;
  e.emit = () => {};
  e.beginPractice();
  assert.equal(e.tutorial.step, 0);
  e.updatePractice();
  assert.equal(e.tutorial.step, 0);
  e.game.player.z += 9;
  e.updatePractice();
  assert.equal(e.tutorial.step, 1);
  e.yaw = 0.5;
  e.updatePractice();
  assert.equal(e.tutorial.step, 2);
  assert(e.practiceObjective().target);
  e.game.collected.push('practice');
  e.updatePractice();
  assert.equal(e.tutorial.step, 3);
  e.game.player.carId = e.game.cars[0].id;
  e.updatePractice();
  assert.equal(e.tutorial.step, 4);
  e.game.player.carId = null;
  e.updatePractice();
  assert.equal(e.tutorial.step, 5);
  startTournament(e.game);
  e.updatePractice();
  assert.equal(e.tutorial, null);
  e.beginPractice();
  assert.equal(e.tutorial, null);
});
test('pause clears held stick and camera touches', () => {
  const e = Object.create(CityEngine.prototype);
  e.game = createGame();
  e.game.status = 'playing';
  e.emit = () => {};
  e.setMove(0.6, 1);
  e.lookPointer = 4;
  e.pause();
  assert.deepEqual(e.moveInput, { x: 0, y: 0 });
  assert.equal(e.lookPointer, null);
  assert.equal(e.game.status, 'paused');
});
test('camera touch stays active when another finger releases the joystick', () => {
  const surface = () => ({
    handlers: new Map(),
    addEventListener(name, fn) {
      this.handlers.set(name, fn);
    },
    removeEventListener() {},
  });
  const oldWindow = globalThis.window,
    oldDocument = globalThis.document;
  const win = surface(),
    doc = surface(),
    canvas = surface();
  canvas.setPointerCapture = () => {};
  globalThis.window = win;
  globalThis.document = doc;
  try {
    const e = Object.create(CityEngine.prototype);
    e.renderer = { domElement: canvas };
    e.game = createGame();
    e.game.status = 'playing';
    e.lookPointer = null;
    e.yaw = 0;
    e.cameraLift = 0;
    e.bindEvents();
    canvas.handlers.get('pointerdown')({
      pointerType: 'touch',
      pointerId: 7,
      clientX: 200,
      clientY: 100,
    });
    win.handlers.get('pointermove')({
      pointerType: 'touch',
      pointerId: 7,
      clientX: 240,
      clientY: 120,
    });
    assert.equal(e.yaw, -0.32);
    assert.equal(e.cameraLift, 1.2);
    win.handlers.get('pointerup')({ pointerId: 3 });
    assert.equal(e.lookPointer, 7);
    win.handlers.get('pointermove')({
      pointerType: 'touch',
      pointerId: 7,
      clientX: 250,
      clientY: 120,
    });
    assert.equal(e.yaw, -0.4);
    win.handlers.get('pointercancel')({ pointerId: 7 });
    assert.equal(e.lookPointer, null);
  } finally {
    if (oldWindow === undefined) delete globalThis.window;
    else globalThis.window = oldWindow;
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  }
});
