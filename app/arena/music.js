// Original adaptive scores, synthesized locally without downloading music files.
export const SCORES = [
  {
    name: '멈춘 놀이터',
    bpm: 86,
    root: 50,
    melody: [
      12,
      null,
      19,
      null,
      13,
      null,
      7,
      null,
      12,
      15,
      null,
      13,
      7,
      null,
      1,
      null,
    ],
    chords: [0, -1, -5, -1],
    pulse: 4,
    tone: 'bell',
  },
  {
    name: '설탕 위의 초침',
    bpm: 76,
    root: 57,
    melody: [
      12,
      null,
      7,
      15,
      null,
      19,
      15,
      null,
      13,
      null,
      7,
      12,
      null,
      8,
      7,
      null,
    ],
    chords: [0, -5, -2, -1],
    pulse: 8,
    tone: 'pluck',
  },
  {
    name: '벼랑의 맥박',
    bpm: 124,
    root: 38,
    melody: [0, 7, 12, 7, 0, 7, 15, 7, 0, 7, 12, 19, 15, 12, 7, 1],
    chords: [0, 0, -5, -1],
    pulse: 2,
    tone: 'string',
  },
  {
    name: '한 번의 궤적',
    bpm: 100,
    root: 45,
    melody: [
      12,
      null,
      15,
      19,
      7,
      null,
      12,
      null,
      10,
      7,
      null,
      15,
      12,
      null,
      7,
      null,
    ],
    chords: [0, -2, -5, -2],
    pulse: 4,
    tone: 'pluck',
  },
  {
    name: '발밑의 심연',
    bpm: 68,
    root: 42,
    melody: [
      24,
      null,
      null,
      19,
      null,
      null,
      13,
      null,
      24,
      null,
      25,
      null,
      19,
      null,
      null,
      13,
    ],
    chords: [0, -1, -6, -1],
    pulse: 8,
    tone: 'bell',
  },
  {
    name: '마지막 원',
    bpm: 132,
    root: 38,
    melody: [12, 7, 12, 15, 19, 15, 12, 7, 13, 7, 13, 17, 20, 17, 13, 7],
    chords: [0, -5, -2, -1],
    pulse: 2,
    tone: 'string',
  },
];

export function tensionFor(s) {
  const clock = Math.max(0, 1 - s.time / 60);
  const danger =
    s.round === 2
      ? Math.max(0, (0.5 - s.force) * 2)
      : s.round === 4
        ? s.progress / 18
        : s.round === 5
          ? Math.max(
              0,
              1 - Math.hypot(s.x - s.opponentX, s.z - s.opponentZ) / 8,
            )
          : s.round === 3 && s.stone?.active
            ? 0.75
            : 0;
  return Math.min(1, Math.max(clock, danger));
}

export function createMusic(ctx) {
  const bus = ctx.createGain(),
    dry = ctx.createGain(),
    echo = ctx.createDelay(1),
    feedback = ctx.createGain(),
    wet = ctx.createGain();
  bus.gain.value = 0;
  dry.connect(bus);
  dry.connect(echo);
  echo.delayTime.value = 0.29;
  echo.connect(feedback);
  feedback.gain.value = 0.22;
  feedback.connect(echo);
  echo.connect(wet);
  wet.gain.value = 0.17;
  wet.connect(bus);
  bus.connect(ctx.destination);
  const nodes = new Set();
  let current = null,
    step = 0,
    next = 0,
    running = false,
    muted = false,
    volume = 0.65,
    ended = '';
  const hz = (n) => 440 * 2 ** ((n - 69) / 12);
  const noise = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  function own(source, chain) {
    nodes.add(source);
    source.onended = () => {
      nodes.delete(source);
      source.disconnect();
      chain.forEach((n) => n.disconnect());
    };
  }
  function note(midi, time, duration, level, kind = 'pluck') {
    const o = ctx.createOscillator(),
      gain = ctx.createGain(),
      filter = ctx.createBiquadFilter();
    o.type =
      kind === 'string' ? 'sawtooth' : kind === 'pad' ? 'triangle' : 'sine';
    o.frequency.value = hz(midi);
    filter.type = 'lowpass';
    filter.frequency.value =
      kind === 'string' ? 1100 : kind === 'pad' ? 550 : 4200;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(
      level,
      time + (kind === 'pad' ? 0.2 : 0.012),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    o.connect(filter);
    filter.connect(gain);
    gain.connect(dry);
    own(o, [gain, filter]);
    o.start(time);
    o.stop(time + duration + 0.02);
    if (kind === 'bell')
      note(midi + 19, time, duration * 0.45, level * 0.22, 'pluck');
  }
  function drum(time, strong = false) {
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.frequency.setValueAtTime(strong ? 130 : 85, time);
    o.frequency.exponentialRampToValueAtTime(38, time + 0.18);
    g.gain.setValueAtTime(strong ? 0.2 : 0.11, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);
    o.connect(g);
    g.connect(dry);
    own(o, [g]);
    o.start(time);
    o.stop(time + 0.27);
  }
  function tickSound(time, level) {
    const n = ctx.createBufferSource(),
      g = ctx.createGain(),
      f = ctx.createBiquadFilter();
    n.buffer = noise;
    f.type = 'highpass';
    f.frequency.value = 4500;
    g.gain.setValueAtTime(level, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);
    n.connect(f);
    f.connect(g);
    g.connect(dry);
    own(n, [g, f]);
    n.start(time);
    n.stop(time + 0.07);
  }
  function silence() {
    bus.gain.cancelScheduledValues(ctx.currentTime);
    bus.gain.setTargetAtTime(0, ctx.currentTime, 0.025);
    for (const n of nodes) {
      try {
        n.stop(ctx.currentTime + 0.1);
      } catch {}
    }
    running = false;
  }
  function update(s, paused = false) {
    if (current !== s) {
      silence();
      current = s;
      step = 0;
      next = ctx.currentTime + 0.12;
      ended = '';
    }
    if (
      paused ||
      muted ||
      volume === 0 ||
      !['playing', 'opening', 'dying', 'won', 'lost'].includes(s.status)
    ) {
      if (running) silence();
      return;
    }
    if (ctx.state !== 'running') return;
    const score = SCORES[s.round],
      danger = tensionFor(s);
    if (['dying', 'won', 'lost'].includes(s.status)) {
      const outcome = s.status === 'won' ? 'won' : 'lost';
      if (ended !== outcome) {
        silence();
        ended = outcome;
        running = true;
        bus.gain.setTargetAtTime(volume * 0.65, ctx.currentTime, 0.04);
        const t = ctx.currentTime + 0.12;
        if (outcome === 'won')
          [0, 7, 12, 15, 19].forEach((n, i) =>
            note(score.root + 12 + n, t + i * 0.12, 1.4, 0.1, 'bell'),
          );
        else {
          drum(t, true);
          [0, 1, 6].forEach((n) => note(score.root + n, t, 2.3, 0.08, 'pad'));
        }
      }
      return;
    }
    if (!running) {
      running = true;
      next = ctx.currentTime + 0.12;
    }
    // The chant always stays clear; silence is part of the red-light tension.
    const duck =
      s.round === 0
        ? s.light === 'green'
          ? 0.24
          : 0.42
        : s.status === 'opening'
          ? 0.5
          : 1;
    bus.gain.setTargetAtTime(volume * 0.65 * duck, ctx.currentTime, 0.15);
    if (next < ctx.currentTime) next = ctx.currentTime + 0.025;
    while (next < ctx.currentTime + 0.14) {
      const beat = 60 / score.bpm,
        bar = Math.floor(step / 16),
        i = step % 16;
      const root =
        score.root + score.chords[Math.floor(bar / 2) % score.chords.length];
      const m = score.melody[i];
      if (i === 0) {
        note(root, next, beat * 7.8, 0.065, 'pad');
        note(root + 7, next, beat * 7.5, 0.035, 'pad');
      }
      if (m !== null)
        note(
          root + m + (bar % 8 === 7 ? 12 : 0),
          next,
          beat * (score.tone === 'bell' ? 2.8 : 0.8),
          0.065,
          score.tone,
        );
      if (step % score.pulse === 0) {
        note(root - 12, next, beat * 0.85, 0.11);
        drum(next, i === 0);
      }
      if (s.round === 1 || s.round === 3 || s.round === 2 || s.round === 5) {
        if (i % 2 === 1) tickSound(next, 0.018 + danger * 0.022);
      }
      if (danger > 0.4 && i % 4 === 2) drum(next);
      if (danger > 0.7 && i % 2 === 0)
        note(root + 19, next, beat * 0.35, 0.035, 'string');
      next += beat / 2;
      step++;
    }
  }
  return {
    update,
    pause: silence,
    mute(value) {
      muted = value;
      if (value) silence();
    },
    volume(value) {
      volume = Math.max(0, Math.min(1, Number(value) || 0));
      if (volume === 0) silence();
    },
    dispose() {
      silence();
      bus.disconnect();
      dry.disconnect();
      echo.disconnect();
      feedback.disconnect();
      wet.disconnect();
    },
  };
}
