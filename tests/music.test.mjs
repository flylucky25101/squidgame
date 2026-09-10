import test from 'node:test';
import assert from 'node:assert/strict';
import { createMusic, SCORES, tensionFor } from '../app/arena/music.js';

function fakeAudio() {
  const sources = [];
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
    setTargetAtTime() {},
    cancelScheduledValues() {},
  });
  const node = () => ({
    gain: param(),
    frequency: param(),
    delayTime: param(),
    connect() {},
    disconnect() {},
  });
  const source = () => {
    const s = {
      ...node(),
      start(t) {
        assert.ok(Number.isFinite(t));
        s.started = t;
      },
      stop(t) {
        s.stopped = t;
      },
    };
    sources.push(s);
    return s;
  };
  return {
    currentTime: 0,
    state: 'running',
    sampleRate: 8000,
    destination: node(),
    sources,
    createGain: node,
    createDelay: node,
    createBiquadFilter: node,
    createOscillator: source,
    createBufferSource: source,
    createBuffer: (_, n) => ({ getChannelData: () => new Float32Array(n) }),
  };
}
const state = (round) => ({
  round,
  status: 'playing',
  time: 120,
  force: 0.5,
  progress: 0,
  x: 0,
  z: 0,
  opponentX: 10,
  opponentZ: 10,
  light: 'green',
});

test('six scores schedule finite notes and stay bounded over long playback', () => {
  assert.equal(new Set(SCORES.map((s) => JSON.stringify(s.melody))).size, 6);
  for (let round = 0; round < 6; round++) {
    const ctx = fakeAudio(),
      music = createMusic(ctx),
      s = state(round);
    for (let i = 0; i < 600; i++) {
      ctx.currentTime = i * 0.05;
      music.update(s);
    }
    assert.ok(ctx.sources.length > 20 && ctx.sources.length < 700);
    assert.ok(ctx.sources.every((n) => Number.isFinite(n.stopped)));
    music.dispose();
  }
});
test('pause, mute, zero volume and ready screen suppress scheduling; playback resumes', () => {
  const c = fakeAudio(),
    m = createMusic(c),
    s = state(2);
  m.update(s);
  const count = c.sources.length;
  c.currentTime = 1;
  m.update(s, true);
  assert.equal(c.sources.length, count);
  m.mute(true);
  c.currentTime = 2;
  m.update(s);
  assert.equal(c.sources.length, count);
  m.mute(false);
  m.volume(0);
  c.currentTime = 3;
  m.update(s);
  assert.equal(c.sources.length, count);
  m.volume(0.5);
  m.update(s);
  assert.ok(c.sources.length > count);
  s.status = 'ready';
  const before = c.sources.length;
  c.currentTime = 4;
  m.update(s);
  assert.equal(c.sources.length, before);
});
test('outcome music plays once and a new run restarts the score', () => {
  const c = fakeAudio(),
    m = createMusic(c),
    s = state(0);
  m.update(s);
  s.status = 'dying';
  m.update(s);
  const count = c.sources.length;
  c.currentTime = 1;
  m.update(s);
  s.status = 'lost';
  m.update(s);
  assert.equal(c.sources.length, count);
  m.update(state(0));
  assert.ok(c.sources.length > count);
});
test('danger rises with rope disadvantage, bridge progress and nearby defender', () => {
  for (const round of [2, 4, 5]) {
    const s = state(round),
      before = tensionFor(s);
    s.force = 0.1;
    s.progress = 17;
    s.opponentX = 1;
    s.opponentZ = 0;
    assert.ok(tensionFor(s) > before);
  }
});
