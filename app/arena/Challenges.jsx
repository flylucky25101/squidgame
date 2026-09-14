import React from 'react';
import { challengeAction } from './challenges.js';
function Person({ x, y, selected = false, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cy="14" rx="8" ry="3" fill="#0005" />
      <path
        d="M-4 3L-5 13M4 3L5 13M-5 -4L-9 4M5 -4L9 4"
        stroke={selected ? '#ffe89a' : '#5eb4a3'}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect
        x="-6"
        y="-7"
        width="12"
        height="15"
        rx="4"
        fill={selected ? '#ffe89a' : '#218b7b'}
      />
      <circle cy="-12" r="5" fill="#eac6a4" />
      <path d="M-5 -14Q0 -22 5 -14" fill="#182a2d" />
    </g>
  );
}
export default function Challenges({ s, onAction, onForward }) {
  const c = s.challenge;
  if (!c) return null;
  const act = (a, v) => onAction(a, v);
  return (
    <section className={`challenge-stage ${c.kind}`}>
      <div className="challenge-guide" role="status">
        <strong>
          {c.kind === 'mingle'
            ? `${c.stage + 1} / 3 라운드 · ${c.phase === 'spin' ? '회전 중' : c.phase === 'safe' ? '문 잠금 완료' : `${c.target}명! 현재 ${c.team.length + 1}명`}`
            : c.kind === 'gonggi'
              ? `${Math.min(5, c.stage + 1)}단계 · ${c.phase === 'air' ? '돌이 공중에 있습니다' : '돌을 던져 시작'}`
              : `결승선까지 ${Math.max(0, 38 - c.distance).toFixed(0)}m`}
        </strong>
        <span>
          {s.message ||
            (c.kind === 'mingle'
              ? '인원이 발표되면 동료를 선택하고 빈 방에 들어가세요.'
              : c.kind === 'gonggi'
                ? '던지기 → 바닥 돌 집기 → 내려오는 돌 받기'
                : '이동 버튼을 누른 채 줄과 중앙 틈을 점프하세요.')}
        </span>
      </div>
      {c.kind === 'mingle' && (
        <>
          <div className="mingle-rooms">
            {c.rooms.map((n, i) => (
              <button
                key={i}
                disabled={c.phase !== 'choose'}
                onClick={() => act('room', i)}
                className={n === c.target ? 'vacant' : 'occupied'}
              >
                <span>ROOM {i + 1}</span>
                <strong>{n === c.target ? '빈 방' : '다른 팀'}</strong>
                <small>{n === c.target ? '입장 →' : '사용 중'}</small>
              </button>
            ))}
          </div>
          <svg
            viewBox="0 0 120 100"
            className={c.phase === 'spin' ? 'carousel spinning' : 'carousel'}
          >
            <defs>
              <radialGradient id="floor">
                <stop stopColor="#d693a2" />
                <stop offset="1" stopColor="#5b3a66" />
              </radialGradient>
            </defs>
            <ellipse
              cx="60"
              cy="60"
              rx="57"
              ry="38"
              fill="url(#floor)"
              stroke="#eccb84"
            />
            {Array.from({ length: 12 }, (_, i) => (
              <path
                key={i}
                d="M60 60L116 60"
                stroke="#f2d39a55"
                transform={`rotate(${i * 30} 60 60)`}
              />
            ))}
            {c.people.map((p) => (
              <g
                key={p.id}
                role="button"
                tabIndex="0"
                aria-label={`참가자 ${p.id + 1}${c.team.includes(p.id) ? ' 선택됨' : ''}`}
                onClick={() => act('person', p.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') act('person', p.id);
                }}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="11"
                  fill={c.team.includes(p.id) ? '#ffdf8066' : 'transparent'}
                />
                <Person
                  x={p.x}
                  y={p.y}
                  selected={c.team.includes(p.id)}
                  scale={0.65}
                />
              </g>
            ))}
            <Person x={60} y={88} selected scale={0.7} />
            <text x="60" y="99" textAnchor="middle" fill="#fff4b4" fontSize="4">
              나 · 456
            </text>
          </svg>
          <progress max={13 - c.stage * 1.5} value={Math.max(0, c.clock)} />
          <p>나도 1명에 포함됩니다 · 동료를 다시 누르면 선택 취소</p>
        </>
      )}
      {c.kind === 'gonggi' && (
        <>
          <div className="gonggi-order">
            {c.stage < 4
              ? `이번에 ${[[1, 1, 1, 1], [2, 2], [3, 1], [4]][c.stage][c.group]}개 집기 · 선택 ${c.picked.length}개`
              : '마지막: 손등에 올린 다섯 알을 받아 마무리'}
          </div>
          <svg viewBox="0 0 120 110">
            <rect x="2" y="2" width="116" height="106" rx="14" fill="#c1a383" />
            <ellipse cx="60" cy="92" rx="23" ry="8" fill="#71513966" />
            <path
              d="M40 108V85Q42 71 46 85V73Q49 66 51 78V70Q55 64 57 76V73Q62 67 63 80L72 76Q82 77 72 88L65 106"
              fill="#e9ba91"
              stroke="#a77458"
            />
            <circle
              cx="60"
              cy={45 - c.air * 32}
              r={c.stage === 4 ? 6 : 4}
              fill={c.flight >= 0.9 ? '#ffeaa7' : '#dc597d'}
              stroke="white"
              strokeWidth="1"
            />
            {c.stones
              .filter(
                (p) =>
                  !c.held.includes(p.id) &&
                  !c.picked.includes(p.id) &&
                  c.stage < 4,
              )
              .map((p, i) => (
                <g
                  key={p.id}
                  role="button"
                  tabIndex="0"
                  aria-label={`공깃돌 ${p.id + 1}`}
                  onClick={() => act('stone', p.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') act('stone', p.id);
                  }}
                >
                  <circle cx={p.x} cy={p.y} r="10" fill="transparent" />
                  <path
                    d={`M${p.x - 5} ${p.y}l3 -5 6 1 2 5 -4 4 -6 -1Z`}
                    fill={['#387cab', '#dd637d', '#6b9561', '#d4a02c'][p.id]}
                    stroke="#fff8"
                  />
                </g>
              ))}
          </svg>
          <div className="challenge-buttons">
            <button disabled={c.phase !== 'ready'} onClick={() => act('toss')}>
              던지기
            </button>
            <button
              disabled={c.phase !== 'air'}
              className={c.flight >= 0.9 ? 'catch-ready' : ''}
              onClick={() => act('catch')}
            >
              받기
            </button>
          </div>
          <p>한 알씩 → 두 알씩 → 세 알+한 알 → 네 알 → 마무리 받기</p>
        </>
      )}
      {c.kind === 'rope' && (
        <>
          <svg viewBox="0 0 400 280">
            <defs>
              <linearGradient id="pit" x2="0" y2="1">
                <stop stopColor="#151f39" />
                <stop offset="1" stopColor="#030812" />
              </linearGradient>
            </defs>
            <rect width="400" height="280" fill="url(#pit)" />
            {Array.from({ length: 12 }, (_, i) => {
              const y = 250 - (i * 4 - c.distance) * 8;
              return (
                <path
                  key={i}
                  d={`M150 ${y}H250`}
                  stroke="#596582"
                  strokeWidth="2"
                />
              );
            })}
            <path d="M148 0V280M252 0V280" stroke="#b9bcc8" strokeWidth="6" />
            <path d="M153 0H247V280H153Z" fill="#a1b0ca33" />
            <rect
              x="150"
              y={250 - (19 - c.distance) * 8 - 8}
              width="100"
              height="16"
              fill="#01040b"
              stroke="#ec618c"
              strokeWidth="3"
            />
            <path
              d={`M40 110Q200 ${110 + Math.cos(c.phase * 6.283) * 135} 360 110`}
              stroke="#eacf9a"
              strokeWidth="7"
              fill="none"
            />
            <circle cx="40" cy="110" r="10" fill="#e88a69" />
            <circle cx="360" cy="110" r="10" fill="#e88a69" />
            <Person
              x={200}
              y={
                225 -
                (c.jump > 0 ? Math.sin((1 - c.jump / 0.9) * Math.PI) * 42 : 0)
              }
              selected
              scale={1.6}
            />
            <text
              x="200"
              y="24"
              textAnchor="middle"
              fill="#f6e2ac"
              fontSize="12"
            >
              줄을 보고 넘으세요 · 중앙에 끊어진 틈
            </text>
          </svg>
          <div className="challenge-buttons">
            <button
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                onForward(true);
              }}
              onPointerUp={() => onForward(false)}
              onPointerCancel={() => onForward(false)}
              onLostPointerCapture={() => onForward(false)}
            >
              누르고 이동 ↑
            </button>
            <button onClick={() => act('jump')}>점프 · SPACE</button>
          </div>
        </>
      )}
    </section>
  );
}
