export const ROUNDS = [
  ['무궁화꽃이 피었습니다', '녹색일 때 전진하고, 적색이 되기 전에 멈추세요. 결승선을 넘으면 통과합니다.', 65],
  ['설탕 뽑기', '바늘로 원의 표시를 순서대로 클릭하거나 터치하세요. 선 밖을 세 번 누르면 탈락합니다.', 55],
  ['줄다리기', '움직이는 표시가 중앙의 밝은 구간에 들어오면 당기세요. 연타하면 힘을 잃습니다.', 45],
  ['구슬치기', '상대가 쥔 구슬의 홀짝을 맞히세요. 2개씩 걸고 상대의 구슬 10개를 모두 가져오세요.', 90],
  ['징검다리', '잠깐 공개되는 강화유리 위치를 기억하세요. 왼쪽 또는 오른쪽 발판을 골라 8칸을 건너세요.', 55],
  ['오징어 게임', '공격자가 되어 수비수를 피해 머리의 원에 도착하세요. 경계 밖으로 나가거나 체력이 소진되면 탈락합니다.', 60],
];
export function newRun(round = 0, practice = false, random = Math.random) {
  return { round, practice, status: 'ready', time: ROUNDS[round][2], elapsed: 0, x: 0, z: 22, health: 100,
    progress: 0, mistakes: 0, force: 0.5, marbles: 10, bridge: Array.from({length:8},()=>random()<0.5?0:1),
    lastAction: -10, message: '', opponentX: 0, opponentZ: -6, random };
}
export function signal(s) { const t = s.elapsed % 7.6; return t < 4 ? 'green' : t < 5.2 ? 'warning' : 'red'; }
export function finish(s, win, message) { s.status = win ? 'won' : 'lost'; s.message = message; }
export function tick(s, dt, input = {}) {
  if(s.status !== 'playing') return;
  dt = Math.min(Math.max(dt,0),0.05); s.elapsed += dt; s.time = Math.max(0,s.time-dt);
  if(!s.time) return finish(s,false,'제한 시간이 끝났습니다.');
  if(s.round===0 || s.round===5) {
    let x=input.x||0,z=input.z||0; const len=Math.hypot(x,z); if(len>1){x/=len;z/=len;}
    if(s.round===0 && signal(s)==='red' && len>0.05) return finish(s,false,'적색 신호에 움직임이 감지되었습니다.');
    s.x += x*dt*7; s.z += z*dt*7;
    if(s.round===0){s.x=Math.max(-15,Math.min(15,s.x));s.z=Math.min(24,s.z);if(s.z < -22)finish(s,true,'결승선을 통과했습니다.');}
    else {
      const dx=s.x-s.opponentX,dz=s.z-s.opponentZ,d=Math.hypot(dx,dz);
      if(d>0.1){s.opponentX+=dx/d*dt*4.7;s.opponentZ+=dz/d*dt*4.7;}
      if(d<1.7)s.health=Math.max(0,s.health-dt*45);
      if(Math.abs(s.x)>10 || s.z>25 || s.z< -25)finish(s,false,'경기장 경계를 벗어났습니다.');
      else if(s.health<=0)finish(s,false,'수비수에게 제압당했습니다.');
      else if(s.z< -21 && Math.abs(s.x)<3)finish(s,true,'오징어의 머리에 도착했습니다.');
    }
  }
  if(s.round===2){s.force=Math.max(0,s.force-dt*0.018);if(s.force===0)finish(s,false,'상대 팀에게 끌려갔습니다.');}
}
export function act(s, value) {
  if(s.status!=='playing')return;
  if(s.round===1){if(value===s.progress){s.progress++;if(s.progress===24)finish(s,true,'모양을 깨뜨리지 않고 분리했습니다.');}else {s.mistakes++;if(s.mistakes>=3)finish(s,false,'설탕이 부서졌습니다.');}}
  if(s.round===2){if(s.elapsed-s.lastAction<0.3)return;s.lastAction=s.elapsed;const good=Math.abs(Math.sin(s.elapsed*3))<0.32;s.force=Math.max(0,Math.min(1,s.force+(good?0.11:-0.07)));s.message=good?'정확한 타이밍!':'중앙에 맞춰 당기세요';if(s.force>=1)finish(s,true,'상대 팀을 끌어당겼습니다.');}
  if(s.round===3){if(s.elapsed-s.lastAction<0.6)return;s.lastAction=s.elapsed;const n=1+Math.floor(s.random()*5);s.marbles+=n%2===value?2:-2;s.message=`상대 구슬 ${n}개 · ${n%2===value?'2개 획득':'2개 잃음'}`;if(s.marbles>=20)finish(s,true,'상대의 구슬을 모두 가져왔습니다.');if(s.marbles<=0)finish(s,false,'구슬을 모두 잃었습니다.');}
  if(s.round===4){if(s.elapsed<4)return;if(value!==s.bridge[s.progress])return finish(s,false,'일반 유리를 밟았습니다.');s.progress++;s.x=value===0?-2:2;s.z=22-s.progress*5.4;if(s.progress===8)finish(s,true,'다리를 건넜습니다.');}
}
