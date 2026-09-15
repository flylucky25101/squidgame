import React from 'react';
export default function Challenges({ s, onAction }) {
  const c = s.challenge;
  if (!c) return null;
  const hunt = c.kind === 'blackout',
    factory = c.kind === 'factory';
  return (
    <>
      <section className="adventure-hud">
        <span className="adventure-tag">
          {hunt
            ? 'STEALTH / BLACKOUT'
            : factory
              ? 'TRAVERSAL / COLLAPSE'
              : 'DRIVING / ESCAPE'}
        </span>
        <h2>
          {hunt
            ? '전원을 되찾아 탈출하세요'
            : factory
              ? '살아 있는 발판을 찾으세요'
              : '추격자를 따돌리세요'}
        </h2>
        <p role="status">
          {s.message ||
            (hunt
              ? '금빛 전원 장치 3개를 찾고 북쪽 출구로 이동'
              : factory
                ? '중앙 지름길 또는 양옆 우회로 · 빨간 압착기는 피하세요'
                : '좌우 조향 · 아래로 감속 · 직선 구간에서 부스트')}
        </p>
        <div className="adventure-meters">
          {hunt ? (
            <>
              <span>전원 {c.cells.length}/3</span>
              <span>체력 {c.health}</span>
              <span>손전등 {Math.ceil(c.charge)}%</span>
            </>
          ) : factory ? (
            <>
              <span>탈출까지 {Math.max(0, 92 - c.z).toFixed(0)}m</span>
              <span>
                {c.hang ? '매달리는 중!' : c.y > 0.1 ? '점프 중' : '발판 위'}
              </span>
            </>
          ) : (
            <>
              <span>{Math.round(c.velocity * 6)} km/h</span>
              <span>차량 {c.health}%</span>
              <span>추격 거리 {c.pursuit.toFixed(0)}m</span>
            </>
          )}
        </div>
        {!hunt && !factory && (
          <progress aria-label="탈출 진행" value={c.z} max="600" />
        )}
      </section>
      <button className="adventure-primary" onClick={() => onAction('primary')}>
        {hunt
          ? c.flash
            ? '손전등 끄기'
            : '손전등 켜기'
          : factory
            ? c.hang
              ? '올라가기!'
              : '점프'
            : c.boost > 0
              ? '부스트 중'
              : '부스트'}
        <small>
          {hunt
            ? '빛을 숨기면 발각 거리 감소'
            : factory
              ? 'SPACE'
              : Math.floor(c.fuel) + '% · SPACE'}
        </small>
      </button>
      {hunt && (
        <div className="adventure-map" aria-label="시설 지도">
          <svg viewBox="-20 -35 40 65">
            <rect
              x="-18"
              y="-33"
              width="36"
              height="61"
              fill="#101d2a"
              stroke="#668993"
            />
            {[
              [-8, 12],
              [8, 4],
              [-8, -6],
              [8, -17],
            ].map(([x, z], i) => (
              <rect
                key={i}
                x={x - 4}
                y={z - 2}
                width="8"
                height="4"
                fill="#455b68"
              />
            ))}
            {[
              [-12, 4],
              [12, -8],
              [-12, -21],
            ].map(
              ([x, z], i) =>
                !c.cells.includes(i) && (
                  <circle key={i} cx={x} cy={z} r="1.4" fill="#ffdc82" />
                ),
            )}
            <path d="M-3 -30H3" stroke="#65ffc5" strokeWidth="2" />
            <circle cx={c.x} cy={c.z} r="1.5" fill="#e7fff1" />
          </svg>
          <span>금색: 전원 / 위: 출구</span>
        </div>
      )}
    </>
  );
}
