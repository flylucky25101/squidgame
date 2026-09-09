'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ROUNDS,
  SHAPES,
  newRun,
  tick,
  act,
  signal,
  chooseShape,
  shapePoints,
  traceAt,
  joystickVector,
} from './rules.js';
import { createArena } from './scene.js';
import { createAudio } from './audio.js';
import './arena.css';

function Joystick({ onMove, reset }) {
  const pointer = useRef(null),
    [knob, setKnob] = useState({ x: 0, z: 0 });
  const release = () => {
    pointer.current = null;
    setKnob({ x: 0, z: 0 });
    onMove({ x: 0, z: 0 });
  };
  useEffect(() => {
    release();
  }, [reset]);
  const move = (e) => {
    if (pointer.current !== e.pointerId) return;
    const r = e.currentTarget.getBoundingClientRect(),
      v = joystickVector(
        e.clientX - r.left - r.width / 2,
        e.clientY - r.top - r.height / 2,
        r.width * 0.34,
      );
    onMove(v);
    setKnob(v);
  };
  return (
    <div
      className="arena-joystick"
      role="group"
      aria-label="이동 조이스틱"
      onPointerDown={(e) => {
        if (pointer.current !== null) return;
        e.preventDefault();
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={move}
      onPointerUp={(e) => {
        if (e.pointerId === pointer.current) release();
      }}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <span className="joystick-cross">＋</span>
      <i
        style={{ transform: `translate(${knob.x * 42}px,${knob.z * 42}px)` }}
      />
      <small>이동</small>
    </div>
  );
}

function Sugar({ s, onTrace }) {
  const pointer = useRef(null),
    previous = useRef(null),
    [needle, setNeedle] = useState(null);
  const sample = (e) => {
    const r = e.currentTarget.getBoundingClientRect(),
      p = [
        ((e.clientX - r.left) / r.width) * 300,
        ((e.clientY - r.top) / r.height) * 300,
      ];
    setNeedle(p);
    if (pointer.current !== e.pointerId) return;
    const old = previous.current || p,
      steps = Math.max(
        1,
        Math.ceil(Math.hypot(p[0] - old[0], p[1] - old[1]) / 4),
      );
    for (let i = 1; i <= steps; i++)
      onTrace(
        old[0] + ((p[0] - old[0]) * i) / steps,
        old[1] + ((p[1] - old[1]) * i) / steps,
      );
    previous.current = p;
  };
  const d = s.trace.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' '),
    done = s.trace
      .slice(0, s.progress)
      .map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`)
      .join(' '),
    next = s.trace[Math.min(s.progress, s.trace.length - 1)];
  return (
    <section className="arena-task sugar-task">
      <div className="task-heading">
        <h2>{SHAPES[s.shape]}</h2>
        <span>{Math.round((s.progress / s.trace.length) * 100)}% 분리</span>
      </div>
      <svg
        viewBox="0 0 300 300"
        aria-label="달고나 윤곽 따라 긁기"
        onPointerDown={(e) => {
          e.preventDefault();
          pointer.current = e.pointerId;
          previous.current = null;
          e.currentTarget.setPointerCapture(e.pointerId);
          sample(e);
        }}
        onPointerMove={sample}
        onPointerUp={() => {
          pointer.current = null;
          previous.current = null;
        }}
        onPointerCancel={() => {
          pointer.current = null;
          previous.current = null;
        }}
        onLostPointerCapture={() => {
          pointer.current = null;
          previous.current = null;
        }}
      >
        <defs>
          <radialGradient id="sugar">
            <stop offset="0" stopColor="#e6b15d" />
            <stop offset=".8" stopColor="#c98b3c" />
            <stop offset="1" stopColor="#996029" />
          </radialGradient>
        </defs>
        <circle cx="150" cy="150" r="146" fill="#899192" />
        <circle cx="150" cy="150" r="139" fill="url(#sugar)" />
        {Array.from({ length: 75 }, (_, i) => (
          <circle
            key={i}
            cx={35 + ((i * 53) % 231)}
            cy={35 + ((i * 79) % 231)}
            r={1 + (i % 3) * 0.4}
            fill="#b67b35"
            opacity=".3"
          />
        ))}
        <path
          d={d}
          fill="none"
          stroke="#774719"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d={done} fill="none" stroke="#fff1c8" strokeWidth="4" />
        <circle
          cx={next[0]}
          cy={next[1]}
          r="7"
          fill="#fff6d2"
          stroke="#725d39"
          strokeWidth="2"
        />
        {s.damage > 0.1 && (
          <path
            d="M18 160l31 -8 -10 -27 16 -18"
            fill="none"
            stroke="#77431e"
            strokeWidth="2"
          />
        )}
        {needle && (
          <path
            d={`M${needle[0]} ${needle[1]}l28 -42`}
            stroke="#e7eeee"
            strokeWidth="3"
          />
        )}
      </svg>
      <p>밝은 점에서 시작해 선을 따라 천천히 드래그하세요.</p>
      <div className="sugar-stress">
        <span>표면 손상</span>
        <progress value={s.damage} max="1" />
      </div>
    </section>
  );
}

export default function Arena() {
  const mount = useRef(null),
    run = useRef(null);
  if (!run.current) run.current = newRun();
  const keys = useRef({}),
    move = useRef({ x: 0, z: 0 }),
    audio = useRef(null),
    options = useRef({ paused: false, overview: true });
  const [s, setS] = useState(() => ({ ...run.current })),
    [paused, setPaused] = useState(false),
    [muted, setMuted] = useState(false),
    [overview, setOverview] = useState(true),
    [error, setError] = useState(''),
    [reset, setReset] = useState(0);
  const clearInput = () => {
    keys.current = {};
    move.current = { x: 0, z: 0 };
    setReset((v) => v + 1);
  };
  const pauseTo = (value) => {
    options.current.paused = value;
    setPaused(value);
    clearInput();
  };
  const start = (round = 0, practice = false) => {
    const old = run.current;
    run.current = newRun(round, practice);
    run.current.memory = old.memory;
    clearInput();
    setS({ ...run.current });
  };
  const action = (value) => {
    if (options.current.paused) return;
    act(run.current, value);
    setS({ ...run.current });
  };
  useEffect(() => {
    audio.current = createAudio();
    let dispose;
    let lastRun = null,
      lastEvent = 0,
      lastShot = 0,
      lastLight = '',
      hud = 0;
    try {
      dispose = createArena(
        mount.current,
        () => run.current,
        (dt) => {
          const r = run.current;
          if (lastRun !== r) {
            lastRun = r;
            lastEvent = 0;
            lastShot = 0;
            lastLight = '';
          }
          if (!options.current.paused) {
            const k = keys.current;
            tick(r, dt, {
              x:
                move.current.x +
                (k.d || k.arrowright ? 1 : 0) -
                (k.a || k.arrowleft ? 1 : 0),
              z:
                move.current.z +
                (k.s || k.arrowdown ? 1 : 0) -
                (k.w || k.arrowup ? 1 : 0),
            });
            if (
              r.round === 0 &&
              r.status === 'playing' &&
              r.light !== lastLight
            ) {
              audio.current.play(r.light);
              lastLight = r.light;
            }
            if (r.shotId !== lastShot) {
              audio.current.play('shot');
              lastShot = r.shotId;
            }
            if (r.eventId !== lastEvent) {
              audio.current.play(r.eventKind);
              lastEvent = r.eventId;
            }
          }
          hud += dt;
          if (hud > 0.045) {
            setS({ ...r });
            hud = 0;
          }
        },
        () => options.current,
      );
    } catch {
      setError(
        '3D 화면을 열 수 없습니다. 하드웨어 가속을 지원하는 브라우저에서 다시 시도해 주세요.',
      );
    }
    const down = (e) => {
      if (/input|textarea|select/i.test(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k))
        e.preventDefault();
      if (k === 'escape' && !e.repeat) {
        pauseTo(!options.current.paused);
        return;
      }
      if (options.current.paused) return;
      keys.current[k] = true;
      if (e.code === 'Space' && !e.repeat) {
        const r = run.current;
        if (r.round === 0 || r.round === 5) act(r, 'push');
        else if (r.round === 2 || r.round === 3) act(r, 0);
      }
      if (run.current.round === 4 && !e.repeat) {
        if (k === 'q') act(run.current, 0);
        if (k === 'e') act(run.current, 1);
      }
    };
    const up = (e) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    const blur = () => {
      clearInput();
      if (run.current.status === 'playing' || run.current.status === 'dying')
        pauseTo(true);
    };
    const visibility = () => {
      if (document.hidden) blur();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      dispose?.();
      audio.current?.dispose();
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  const isPlaying = s.status === 'playing' && !paused,
    dying = s.status === 'dying',
    reveal = s.memory && s.elapsed < s.revealTime;
  const stageText =
    s.squidStage === 'neck'
      ? '① 목을 왼쪽에서 오른쪽으로 통과'
      : s.squidStage === 'entrance'
        ? '② 바깥을 돌아 아래 입구로 진입'
        : '③ 경계를 지키며 머리의 원으로';
  return (
    <main className={`arena round-${s.round} ${dying ? 'is-dying' : ''}`}>
      <div className="arena-world" ref={mount} />
      <div className="arena-vignette" />
      <header className="arena-header">
        <a href="./" className="arena-brand">
          ○ △ □ <span>THE ISLAND</span>
        </a>
        <div className="arena-tools">
          <button
            aria-label={muted ? '소리 켜기' : '소리 끄기'}
            onClick={() => {
              setMuted(!muted);
              audio.current?.mute(!muted);
            }}
          >
            {muted ? '소리 OFF' : '소리 ON'}
          </button>
          <button onClick={() => pauseTo(!paused)}>
            {paused ? '계속' : '일시정지'}
          </button>
          <a href="./?mode=city">도시 모드 ↗</a>
        </div>
      </header>
      <aside className="arena-round">
        <span>PLAYER 456 / ROUND 0{s.round + 1}</span>
        <h1>{ROUNDS[s.round][0]}</h1>
        {s.round === 0 ? (
          <div className="crowd-count">
            <strong>
              {s.crowd.filter((n) => n.alive).length +
                (dying || s.status === 'lost' ? 0 : 1)}
            </strong>{' '}
            / 456 생존
            <button
              onClick={() => {
                options.current.overview = !overview;
                setOverview(!overview);
              }}
            >
              {overview ? '가까이 보기' : '전체 보기'}
            </button>
          </div>
        ) : (
          <p>{ROUNDS[s.round][1]}</p>
        )}
      </aside>
      <div className="arena-clock">
        <span>TIME REMAINING</span>
        <strong>
          {Math.floor(Math.ceil(s.time) / 60)
            .toString()
            .padStart(2, '0')}
          :{(Math.ceil(s.time) % 60).toString().padStart(2, '0')}
        </strong>
        <small>{s.practice ? '연습 경기' : '6 ROUND SURVIVAL'}</small>
      </div>
      {isPlaying && (
        <>
          {s.round === 0 && (
            <div className={'arena-signal ' + signal(s)}>
              {s.light === 'green'
                ? '무궁화꽃이 피었습니다'
                : s.light === 'warning'
                  ? '영희가 돌아봅니다'
                  : '움직이지 마세요'}
              <small>
                {s.light === 'warning'
                  ? `${s.lightRemaining.toFixed(1)}초 뒤 움직임 감지`
                  : s.light === 'green'
                    ? '빈 공간을 찾아 이동하세요'
                    : '조이스틱에서 손을 떼세요'}
              </small>
            </div>
          )}
          {s.round === 1 && (
            <Sugar
              s={s}
              onTrace={(x, y) => {
                if (!options.current.paused) traceAt(run.current, x, y);
              }}
            />
          )}
          {s.round === 2 && (
            <section className="arena-action-dock tug-dock">
              <div className="team-score">
                <span>우리 팀 10명</span>
                <strong>줄다리기</strong>
                <span>상대 팀 10명</span>
              </div>
              <progress value={s.force} max="1" />
              <div className="arena-timing">
                <i />
                <b style={{ left: `${50 + Math.sin(s.elapsed * 3) * 46}%` }} />
              </div>
              <button className="arena-primary" onClick={() => action(0)}>
                함께 당기기 <small>SPACE</small>
              </button>
              <p>{s.message || '표시가 밝은 중앙에 들어올 때 당기세요.'}</p>
            </section>
          )}
          {s.round === 3 && (
            <>
              <div className="jegi-count">
                <strong>{s.kicks}</strong>
                <span>/ 5 연속</span>
              </div>
              <section className="arena-action-dock jegi-dock">
                <div className="jegi-height">
                  <span>발 높이</span>
                  <i />
                  <b
                    style={{ left: `${Math.min(96, (s.jegiY / 2.5) * 100)}%` }}
                  />
                </div>
                <button
                  className="arena-primary"
                  disabled={s.jegiReset > 0}
                  onClick={() => action(0)}
                >
                  {!s.jegiActive
                    ? '제기 띄우기'
                    : s.jegiV < 0 && s.jegiY <= 1.15
                      ? '지금 차세요!'
                      : '제기 차기'}{' '}
                  <small>SPACE</small>
                </button>
                <p>
                  {s.message || '내려오는 제기가 발 높이에 왔을 때 차세요.'}
                </p>
              </section>
            </>
          )}
          {s.round === 4 && (
            <>
              <div className="bridge-instruction">
                {reveal ? (
                  <>
                    <strong>
                      ✓ 연두색만 기억하세요 ·{' '}
                      {Math.ceil(s.revealTime - s.elapsed)}초
                    </strong>
                    <span>분홍색은 일반 유리 · 기억할 필요 없음</span>
                  </>
                ) : (
                  <>
                    <strong>{s.progress} / 18 칸 통과</strong>
                    <span>
                      {s.memory
                        ? '기억 도움 켜짐'
                        : '원작 방식 · 정답 사전 공개 없음'}
                    </span>
                  </>
                )}
              </div>
              <section className="arena-action-dock bridge-dock">
                <div className="bridge-map" aria-label="유리다리 진행도">
                  {s.bridge.map((safe, i) => (
                    <div key={i} className={i === s.progress ? 'current' : ''}>
                      <span>{i + 1}</span>
                      {[0, 1].map((side) => (
                        <i
                          key={side}
                          className={
                            reveal
                              ? safe === side
                                ? 'safe'
                                : 'unsafe'
                              : i < s.progress && safe === side
                                ? 'passed'
                                : ''
                          }
                        >
                          {reveal
                            ? safe === side
                              ? '✓'
                              : '×'
                            : i < s.progress && safe === side
                              ? '✓'
                              : '·'}
                        </i>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="arena-choice">
                  <button
                    disabled={reveal || !!s.jump}
                    onClick={() => action(0)}
                  >
                    ↖ 왼쪽 <small>Q</small>
                  </button>
                  <button
                    disabled={reveal || !!s.jump}
                    onClick={() => action(1)}
                  >
                    오른쪽 ↗ <small>E</small>
                  </button>
                </div>
              </section>
            </>
          )}
          {s.round === 5 && (
            <div className="squid-objective">
              <strong>{stageText}</strong>
              <span>
                {s.squidStage === 'neck'
                  ? '외발 이동 · 목의 금색 통로를 건너세요'
                  : s.squidStage === 'entrance'
                    ? '두 발 이동 · 오른쪽 바깥으로 돌아가세요'
                    : '밀치기 준비 표시가 뜨면 옆으로 피하세요'}
              </span>
              <progress value={s.stamina} max="1" />
            </div>
          )}
          {(s.round === 0 || s.round === 5) && (
            <>
              <div className="arena-controls">
                <Joystick onMove={(v) => (move.current = v)} reset={reset} />
                <span>
                  WASD / 방향키
                  <br />
                  스틱을 놓으면 정지
                </span>
              </div>
              <button
                className="arena-push"
                disabled={
                  s.round === 0 ? s.light !== 'green' : s.stamina < 0.45
                }
                onClick={() => action('push')}
              >
                {s.round === 0 ? '길 확보' : '밀치기'}
                <small>SPACE</small>
              </button>
            </>
          )}
          {s.message && s.messageUntil > s.elapsed && s.round === 0 && (
            <div className="arena-announcement" role="status">
              {s.message}
            </div>
          )}
        </>
      )}
      {dying && !paused && (
        <div className="elimination-caption">
          <span>움직임 감지 / ELIMINATION</span>
          <strong>
            {s.deathKind === 'fall'
              ? '유리가 깨졌습니다'
              : s.deathKind === 'tug'
                ? '줄을 놓쳤습니다'
                : '참가자 456 탈락'}
          </strong>
        </div>
      )}
      {((!['playing', 'dying'].includes(s.status) &&
        !(s.round === 2 && s.status === 'won' && s.resultTime < 2.5)) ||
        paused ||
        error) && (
        <div className="arena-overlay">
          <section className="arena-panel">
            <span className="arena-eyebrow">
              {error
                ? 'DISPLAY ERROR'
                : paused
                  ? 'PAUSED'
                  : s.status === 'lost'
                    ? 'ELIMINATED'
                    : s.status === 'won'
                      ? 'ROUND COMPLETE'
                      : `ROUND 0${s.round + 1} / THE ISLAND`}
            </span>
            <h2>
              {error
                ? '화면 연결 실패'
                : paused
                  ? '잠시 숨을 고르세요'
                  : s.status === 'lost'
                    ? '탈락했습니다'
                    : s.status === 'won'
                      ? s.round === 5
                        ? '최후의 생존자'
                        : '경기 통과'
                      : ROUNDS[s.round][0]}
            </h2>
            <p>
              {error ||
                (paused
                  ? '준비되면 경기를 계속하세요.'
                  : s.status === 'ready'
                    ? ROUNDS[s.round][1]
                    : s.message)}
            </p>
            {s.status === 'ready' && !paused && s.round === 1 && (
              <div className="shape-choice">
                {SHAPES.map((name, i) => (
                  <button
                    key={name}
                    className={s.shape === i ? 'selected' : ''}
                    onClick={() => {
                      chooseShape(run.current, i);
                      setS({ ...run.current });
                    }}
                  >
                    <svg viewBox="0 0 300 300" aria-hidden="true">
                      <path
                        d={shapePoints(i)
                          .map((p, j) => `${j ? 'L' : 'M'}${p[0]} ${p[1]}`)
                          .join(' ')}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="9"
                      />
                    </svg>
                    {name}
                    <small>
                      {['쉬움', '보통', '어려움', '매우 어려움'][i]}
                    </small>
                  </button>
                ))}
              </div>
            )}
            {s.status === 'ready' && !paused && s.round === 4 && (
              <label className="memory-toggle">
                <input
                  type="checkbox"
                  checked={s.memory}
                  onChange={(e) => {
                    run.current.memory = e.target.checked;
                    setS({ ...run.current });
                  }}
                />
                <span>
                  기억 도움 사용
                  <small>안전 발판 10초 공개 · 원작에는 없는 보조 기능</small>
                </span>
              </label>
            )}
            {s.status === 'ready' && !paused && s.round === 5 && (
              <ol className="squid-steps">
                <li>왼쪽에서 목을 횡단해 두 발 이동 획득</li>
                <li>바깥을 돌아 아래 입구로 진입</li>
                <li>수비수를 밀치거나 피해 머리의 원을 밟기</li>
              </ol>
            )}
            {!error &&
              (paused ? (
                <>
                  <button
                    className="arena-primary"
                    onClick={() => pauseTo(false)}
                  >
                    계속하기
                  </button>
                  <button
                    className="arena-secondary"
                    onClick={() => {
                      pauseTo(false);
                      start(s.round, true);
                    }}
                  >
                    이 경기 다시 준비
                  </button>
                </>
              ) : s.status === 'ready' ? (
                <button
                  className="arena-primary"
                  onClick={() => {
                    clearInput();
                    audio.current?.play('green');
                    run.current.status = 'playing';
                    setS({ ...run.current });
                  }}
                >
                  경기 시작 →
                </button>
              ) : s.status === 'won' && s.round < 5 && !s.practice ? (
                <button
                  className="arena-primary"
                  onClick={() => start(s.round + 1)}
                >
                  다음 경기 →
                </button>
              ) : (
                <button
                  className="arena-primary"
                  onClick={() => start(s.practice ? s.round : 0, s.practice)}
                >
                  다시 도전 →
                </button>
              ))}
            {s.status === 'ready' && !paused && (
              <>
                <div className="arena-practice">
                  {ROUNDS.map((r, i) => (
                    <button
                      key={r[0]}
                      onClick={() => start(i, true)}
                      className={s.round === i ? 'selected' : ''}
                    >
                      0{i + 1} {r[0]}
                    </button>
                  ))}
                </div>
                <p className="arena-footnote">
                  각 경기를 선택하면 연습 ·{' '}
                  <button onClick={() => start(0, false)}>
                    6경기 연속 도전
                  </button>
                  <br />
                  시즌 1·2 기반 싱글플레이 각색 / v2
                </p>
              </>
            )}
          </section>
        </div>
      )}
      <footer className="arena-footer">
        <span>THE ISLAND / VOL. 02</span>
        <span>○ △ □</span>
        <span>{s.practice ? 'PRACTICE' : 'SURVIVAL'} / 456</span>
      </footer>
    </main>
  );
}
