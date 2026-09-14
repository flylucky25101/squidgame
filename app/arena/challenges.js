export const replacementRound = (r) => [1, 3, 5].includes(r);
export function createChallenge(round, random = Math.random) {
  if (round === 1)
    return {
      kind: 'mingle',
      stage: 0,
      phase: 'spin',
      clock: 3,
      target: 3,
      team: [],
      room: null,
      people: Array.from({ length: 10 }, (_, i) => ({
        id: i,
        x: 12 + (i % 5) * 19,
        y: 33 + Math.floor(i / 5) * 32,
      })),
      rooms: [1, 2, 3, 4],
      resolved: false,
    };
  if (round === 3)
    return {
      kind: 'gonggi',
      stage: 0,
      air: 0,
      flight: 0,
      held: [],
      picked: [],
      group: 0,
      misses: 0,
      phase: 'ready',
      stones: Array.from({ length: 4 }, (_, i) => ({
        id: i,
        x: 23 + (i % 2) * 49 + random() * 6,
        y: 52 + Math.floor(i / 2) * 24,
      })),
    };
  if (round === 5)
    return {
      kind: 'rope',
      distance: 0,
      jump: 0,
      phase: 0,
      cycle: 0,
      checked: false,
      speed: 2.1,
      clears: 0,
    };
  return null;
}
export function challengeAction(s, action, value) {
  if (s.status !== 'playing' || !s.challenge) return;
  const c = s.challenge;
  if (c.kind === 'mingle' && c.phase === 'choose') {
    if (action === 'person' && c.people.some((p) => p.id === value)) {
      c.team = c.team.includes(value)
        ? c.team.filter((id) => id !== value)
        : [...c.team, value];
      c.room = null;
    }
    if (action === 'room' && value >= 0 && value < 4) {
      c.room = value;
      if (c.team.length + 1 !== c.target) {
        s.message = `현재 ${c.team.length + 1}명입니다. 나를 포함해 정확히 ${c.target}명을 모으세요.`;
        return;
      }
      if (c.rooms[value] !== c.target) {
        s.message =
          '이 방은 다른 팀이 차지했습니다. 불이 켜진 빈 방으로 이동하세요.';
        return;
      }
      c.phase = 'safe';
      c.clock = 1.5;
      s.message = '문을 잠갔습니다. 인원 확인 완료!';
    }
  }
  if (c.kind === 'gonggi') {
    if (action === 'toss' && c.phase === 'ready') {
      c.phase = 'air';
      c.air = 1;
      c.flight = 0;
      c.picked = [];
      s.message =
        c.stage === 4
          ? '내려올 때 받기 버튼으로 다섯 알을 받으세요.'
          : '공중의 돌이 떨어지기 전에 바닥 돌을 집으세요.';
    }
    if (
      action === 'stone' &&
      c.phase === 'air' &&
      !c.held.includes(value) &&
      !c.picked.includes(value) &&
      value >= 0 &&
      value < 4
    )
      c.picked.push(value);
    if (action === 'catch' && c.phase === 'air') {
      const groups = [[1, 1, 1, 1], [2, 2], [3, 1], [4], [0]],
        required = groups[c.stage][c.group];
      if (c.flight < 0.9 || c.flight > 1.75 || c.picked.length !== required) {
        gonggiMiss(s);
        return;
      }
      c.held.push(...c.picked);
      c.picked = [];
      c.group++;
      c.phase = 'ready';
      if (c.group === groups[c.stage].length) {
        c.stage++;
        c.group = 0;
        c.held = [];
      }
      s.message = '성공! 다음 던지기를 준비하세요.';
      if (c.stage === 5) {
        s.status = 'won';
        s.message = '공기놀이 다섯 단계를 통과했습니다.';
      }
    }
  }
  if (c.kind === 'rope' && action === 'jump' && c.jump <= 0) {
    c.jump = 0.9;
    s.eventId++;
    s.eventKind = 'kick';
  }
}
function gonggiMiss(s) {
  const c = s.challenge;
  c.misses++;
  c.phase = 'ready';
  c.picked = [];
  c.held = [];
  c.group = 0;
  c.flight = 0;
  s.message =
    '돌을 놓쳤습니다. 현재 단계 처음부터 다시! 내려오는 돌이 밝아질 때 받으세요.';
}
export function challengeTick(s, dt, input = {}) {
  const c = s.challenge;
  if (c.kind === 'mingle') {
    c.clock -= dt;
    if (c.clock > 0) return;
    if (c.phase === 'spin') {
      c.phase = 'choose';
      c.clock = 13 - c.stage * 1.5;
      c.target = 2 + Math.floor(s.random() * 4);
      c.team = [];
      c.room = null;
      c.rooms = Array.from({ length: 4 }, () => 1 + Math.floor(s.random() * 5));
      c.rooms[Math.floor(s.random() * 4)] = c.target;
      s.message = `${c.target}명! 나를 포함한 인원을 맞추고 빈 방으로!`;
    } else if (c.phase === 'safe') {
      c.stage++;
      if (c.stage === 3) {
        s.status = 'won';
        s.message = '세 번의 짝짓기를 모두 살아남았습니다.';
      } else {
        c.phase = 'spin';
        c.clock = 2.5;
        s.message = '회전목마가 다시 움직입니다…';
      }
    } else {
      s.status = 'dying';
      s.deathTime = 0;
      s.message =
        c.team.length + 1 !== c.target
          ? '지정 인원을 맞추지 못했습니다.'
          : '제시간에 빈 방에 들어가지 못했습니다.';
    }
  }
  if (c.kind === 'gonggi' && c.phase === 'air') {
    c.flight += dt;
    c.air = Math.max(0, Math.sin((c.flight / 1.8) * Math.PI));
    if (c.flight > 1.8) gonggiMiss(s);
  }
  if (c.kind === 'rope') {
    c.jump = Math.max(0, c.jump - dt);
    const period = 2.2 - c.distance * 0.006,
      old = c.phase;
    c.phase += dt / period;
    if (c.phase >= 1) {
      c.phase -= 1;
      c.cycle++;
      c.checked = false;
    }
    const height = Math.sin((1 - c.jump / 0.9) * Math.PI) * 2;
    if (!c.checked && c.phase >= 0.5) {
      c.checked = true;
      if (c.distance > 1 && c.distance < 37) {
        if (c.jump === 0 || height < 0.8) {
          s.status = 'dying';
          s.deathKind = 'fall';
          s.deathTime = 0;
          s.message =
            '줄이 발에 걸렸습니다. 줄이 바닥으로 내려오기 직전에 점프하세요.';
          return;
        }
        c.clears++;
      }
    }
    const forward = !!input.forward;
    if (forward) {
      const next = c.distance + dt * 3.2;
      if (next >= 18.4 && next <= 19.6 && (c.jump === 0 || height < 0.5)) {
        s.status = 'dying';
        s.deathKind = 'fall';
        s.deathTime = 0;
        s.message = '다리 중앙의 틈으로 떨어졌습니다. 이동하면서 점프하세요.';
        return;
      }
      c.distance = next;
    }
    if (c.distance >= 38) {
      s.status = 'won';
      s.message = '줄과 중앙의 틈을 넘어 끝까지 건넜습니다.';
    }
  }
}
