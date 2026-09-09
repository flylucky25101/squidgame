export function createAudio() {
  let ctx = null,
    muted = false;
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
    play,
    mute(value) {
      muted = value;
    },
    dispose() {
      ctx?.close();
    },
  };
}
