import { createMusic } from './music.js';

export function createAudio() {
  let music = null;
  let ctx = null,
    muted = false;
  const clips = [],
    voices = new Set();
  function context() {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    music ??= createMusic(ctx);
    return ctx;
  }
  async function preload() {
    try {
      const c = context();
      await Promise.all(
        Array.from({ length: 10 }, async (_, i) => {
          const response = await fetch(`./audio/chant/${i}.wav`);
          if (!response.ok) return;
          const buffer = await c.decodeAudioData(await response.arrayBuffer()),
            samples = buffer.getChannelData(0);
          let a = 0,
            b = samples.length - 1;
          while (a < b && Math.abs(samples[a]) < 0.008) a++;
          while (b > a && Math.abs(samples[b]) < 0.008) b--;
          a = Math.max(0, a - 220);
          b = Math.min(samples.length - 1, b + 440);
          const trimmed = c.createBuffer(1, b - a + 1, buffer.sampleRate);
          trimmed.getChannelData(0).set(samples.subarray(a, b + 1));
          clips[i] = trimmed;
        }),
      );
    } catch {
      /* Local captions remain synchronized if audio is unavailable. */
    }
  }
  function stopChant() {
    voices.forEach((n) => {
      try {
        n.stop();
      } catch {}
    });
    voices.clear();
  }
  function syllable(index, duration) {
    if (muted || !clips[index]) return;
    try {
      const c = context();
      c.resume();
      const n = c.createBufferSource(),
        g = c.createGain();
      n.buffer = clips[index];
      n.playbackRate.value =
        clips[index].duration / Math.max(0.15, duration * 0.95);
      g.gain.value = 0.65;
      n.connect(g);
      g.connect(c.destination);
      voices.add(n);
      n.onended = () => {
        voices.delete(n);
        g.disconnect();
      };
      n.start();
    } catch {}
  }
  preload();
  function play(kind) {
    if (muted) return;
    try {
      ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume();
      const now = ctx.currentTime,
        g = ctx.createGain();
      g.connect(ctx.destination);
      if (kind === 'shot' || kind === 'glass' || kind === 'panic') {
        const duration = kind === 'panic' ? 0.65 : 0.3,
          buffer = ctx.createBuffer(
            1,
            ctx.sampleRate * duration,
            ctx.sampleRate,
          ),
          data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++)
          data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        const n = ctx.createBufferSource();
        n.buffer = buffer;
        const f = ctx.createBiquadFilter();
        f.type = kind === 'panic' ? 'bandpass' : 'highpass';
        f.frequency.value =
          kind === 'shot' ? 200 : kind === 'glass' ? 2000 : 900;
        f.Q.value = kind === 'panic' ? 8 : 0.7;
        n.connect(f);
        f.connect(g);
        g.gain.setValueAtTime(kind === 'shot' ? 0.22 : 0.12, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + duration);
        n.start();
        n.stop(now + duration);
      } else {
        const o = ctx.createOscillator();
        o.type = kind === 'red' ? 'square' : 'sine';
        o.frequency.setValueAtTime(
          kind === 'green'
            ? 660
            : kind === 'warning'
              ? 440
              : kind === 'kick'
                ? 520
                : kind === 'pull'
                  ? 220
                  : kind === 'miss'
                    ? 140
                    : kind === 'red'
                      ? 180
                      : 700,
          now,
        );
        o.frequency.exponentialRampToValueAtTime(
          kind === 'kick' ? 900 : kind === 'red' ? 100 : 400,
          now + 0.17,
        );
        o.connect(g);
        g.gain.setValueAtTime(0.055, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        o.start();
        o.stop(now + 0.22);
      }
    } catch {
      /* Audio failure never interrupts gameplay. */
    }
  }
  return {
    unlock() {
      try {
        context().resume();
      } catch {}
    },
    updateMusic(s, paused) {
      try {
        music?.update(s, paused);
      } catch {}
    },
    pauseMusic() {
      music?.pause();
    },
    musicVolume(value) {
      music?.volume(value);
    },
    play,
    syllable,
    stopChant,
    mute(value) {
      muted = value;
      music?.mute(value);
      if (!value) {
        try {
          context().resume();
        } catch {}
      }
      if (value) stopChant();
    },
    dispose() {
      stopChant();
      music?.dispose();
      ctx?.close();
    },
  };
}
