import { createMusic } from './music.js';
import { CHANT_RECORDINGS } from './chant.js';

export function createAudio() {
  let music = null;
  let volume = 0.8,
    loaded = false,
    lastState = null,
    paused = true,
    timer = null,
    error = '';
  let ctx = null,
    muted = false;
  const clips = [],
    voices = new Set();
  function context() {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    music ??= createMusic(ctx);
    music.volume(volume);
    music.mute(muted);
    timer ??= setInterval(() => {
      try {
        if (lastState) music.update(lastState, paused);
      } catch (e) {
        error = e.message;
      }
    }, 50);
    return ctx;
  }
  async function preload() {
    try {
      const c = context();
      await Promise.all(
        CHANT_RECORDINGS.map(async (recording, i) => {
          const response = await fetch(`./audio/chant/${recording.file}`);
          if (!response.ok) return;
          clips[i] = await c.decodeAudioData(await response.arrayBuffer());
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
  function chant(duration, elapsed = 0) {
    const index = CHANT_RECORDINGS.findIndex(
      (r) => Math.abs(r.duration - duration) < 0.01,
    );
    if (muted) return true;
    if (!clips[index]) return false;
    try {
      const c = context();
      c.resume();
      const n = c.createBufferSource(),
        g = c.createGain();
      n.buffer = clips[index];
      n.playbackRate.value = 1;
      g.gain.value = 0.65;
      n.connect(g);
      g.connect(c.destination);
      voices.add(n);
      n.onended = () => {
        voices.delete(n);
        g.disconnect();
      };
      n.start(0, Math.min(elapsed, clips[index].duration));
      return true;
    } catch {}
  }
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
    async unlock() {
      try {
        const c = context();
        await c.resume();
        if (!loaded) {
          loaded = true;
          await preload();
        }
        error = '';
        return c.state === 'running'
          ? '소리 재생 준비 완료'
          : '브라우저가 소리를 일시 중지했습니다. 다시 눌러주세요.';
      } catch (e) {
        error = e.message;
        return '소리를 시작하지 못했습니다. 기기 음량과 브라우저 소리 권한을 확인하세요.';
      }
    },
    updateMusic(s, paused) {
      try {
        lastState = s;
        this.setPaused(paused);
        music?.update(s, paused);
      } catch (e) {
        error = e.message;
      }
    },
    setPaused(value) {
      paused = value;
    },
    status() {
      return (
        error ||
        (ctx?.state === 'running'
          ? '소리 재생 준비 완료'
          : '소리 켜기를 눌러주세요')
      );
    },
    pauseMusic() {
      paused = true;
      music?.pause();
    },
    musicVolume(value) {
      volume = Number(value);
      music?.volume(value);
    },
    play,
    chant,
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
      clearInterval(timer);
      stopChant();
      music?.dispose();
      ctx?.close();
    },
  };
}
