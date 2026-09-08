'use client';
import { useRef, useState } from 'react';
import { joystickVector } from './mobile';
export default function MobileControls({
  engine,
  state,
}: {
  engine: any;
  state: any;
}) {
  const pointer = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const reset = () => {
    pointer.current = null;
    setKnob({ x: 0, y: 0 });
    engine?.setMove(0, 0);
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== e.pointerId) return;
    const r = e.currentTarget.getBoundingClientRect();
    const v = joystickVector(
      e.clientX - r.left - r.width / 2,
      e.clientY - r.top - r.height / 2,
      r.width * 0.35,
    );
    setKnob({ x: v.x * 36, y: -v.y * 36 });
    engine?.setMove(v.x, v.y);
  };
  const label =
    state.interaction?.type === 'crate'
      ? '확보'
      : state.interaction?.type === 'gate'
        ? '참가'
        : state.interaction?.type === 'bank'
          ? '상환'
          : state.interaction?.type === 'plant'
            ? '복구'
            : '상호작용';
  return (
    <div className="touch-controls mobile-controls">
      <div
        className="joystick"
        aria-label="이동 조이스틱"
        onPointerDown={(e) => {
          if (pointer.current !== null) return;
          pointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={move}
        onPointerUp={(e) => {
          if (pointer.current === e.pointerId) reset();
        }}
        onPointerCancel={(e) => {
          if (pointer.current === e.pointerId) reset();
        }}
        onLostPointerCapture={reset}
      >
        <span
          className="joystick-knob"
          style={{ transform: `translate(${knob.x}px,${knob.y}px)` }}
        />
        <small>{state.player.carId ? '가속 / 제동' : '이동'}</small>
      </div>
      <div className="mobile-actions">
        <button
          className="fire-action"
          disabled={!!state.player.carId}
          onClick={() => engine?.action('shoot')}
        >
          사격
        </button>
        <button
          disabled={!state.interaction}
          onClick={() => engine?.action('interact')}
        >
          {label}
        </button>
        <button onClick={() => engine?.action('car')}>
          {state.player.carId ? '하차' : '탑승'}
        </button>
        <button
          disabled={!!state.player.carId}
          onClick={() => engine?.action('reload')}
        >
          장전
        </button>
        <button
          disabled={state.player.meds < 1 || state.player.hp >= 100}
          onClick={() => engine?.action('heal')}
        >
          치료
        </button>
      </div>
    </div>
  );
}
