'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, Play, Pause, Map, Volume2, VolumeX, Crosshair, Car, Heart, Shield, Users, Radio, Zap, Package, Building2, Wrench, Flag, Skull, Trophy, CircleHelp, Settings2, Check, X, ArrowUp, ArrowDown, ArrowLeft, ChevronRight, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { CityEngine } from './engine';
import { registerGameTools } from './webmcp';
import { ASSETS, BUILDINGS, PLACES, PLANTS, SAVE_KEY, sanitizeProfile, distance } from './model';

type Snapshot = any;
const money = (n: number) => Math.floor(n || 0).toLocaleString('ko-KR');
const time = (n: number) => `${Math.floor(n / 60).toString().padStart(2, '0')}:${Math.floor(n % 60).toString().padStart(2, '0')}`;
const factionNames: Record<string,string> = { independent: '독립 조직', resistance: '해방 연합', organizer: '집행국 협력 조직' };

function CityMap({ state, expanded = false }: { state: Snapshot; expanded?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas || !state) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const size = expanded ? 620 : 240; canvas.width = size * 2; canvas.height = size * 2; ctx.scale(2, 2);
    const s = size / 330, point = (p: { x: number; z: number }) => [(p.x + 165) * s, (p.z + 165) * s];
    ctx.fillStyle = '#15282d'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#243b40';
    for (const road of [-120,-60,0,60,120]) { ctx.fillRect((road+165-7)*s,15*s,14*s,300*s); ctx.fillRect(15*s,(road+165-7)*s,300*s,14*s); }
    ctx.fillStyle = '#3d5557'; for (const b of BUILDINGS) ctx.fillRect((b.x-b.w/2+165)*s,(b.z-b.d/2+165)*s,b.w*s,b.d*s);
    ctx.fillStyle = '#203f47'; ctx.fillRect(309*s,0,21*s,size);
    const dot = (p: any, color: string, radius: number, square = false) => { const [x,y] = point(p); ctx.fillStyle=color; ctx.beginPath(); if(square)ctx.rect(x-radius,y-radius,radius*2,radius*2);else ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill(); };
    state.map.crates.forEach((c: any) => dot(c,'#dcb879',expanded?3:1.6,true));
    if(expanded)state.map.cars.forEach((c:any)=>dot(c,'#8fa5ac',2,true));
    state.map.npcs.filter((n:any)=>n.alive).forEach((n:any)=>dot(n,n.role==='guard'?'#f2728f':n.role==='ally'?'#e6d4a4':'#789697',expanded?3:1.9));
    if(state.phase==='city'){dot(PLACES.gate,'#ff7095',5);dot(PLACES.home,'#a7eac8',4);}
    if(state.phase==='debt')dot(PLACES.bank,'#efcd87',5);
    if(state.phase==='power')PLANTS.forEach(p=>dot(p,state.activated.includes(p.id)?'#a7eac8':'#efcd87',5,true));
    if(state.phase==='escape')dot(PLACES.exit,'#a7eac8',6);
    const target=state.objective.target;
    if(target){const [x,y]=point(target);ctx.strokeStyle='#b9f2d2';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.stroke();}
    const [px,py]=point(state.player);ctx.save();ctx.translate(px,py);ctx.rotate(Math.PI-state.player.angle);ctx.fillStyle='#edfff3';ctx.shadowColor='#9bf2c0';ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(4.5,5);ctx.lineTo(0,3);ctx.lineTo(-4.5,5);ctx.closePath();ctx.fill();ctx.restore();
    if(expanded){ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillStyle='#a0b7b7';[['구도심',-90,-90],['금융가',30,-90],['항만',125,5],['유흥가',-90,30],['주거지',30,30],['산업지대',-30,95]].forEach(([name,x,z])=>ctx.fillText(String(name),(Number(x)+165)*s,(Number(z)+165)*s));}
  },[state,expanded]);
  return <canvas ref={ref} className={expanded?'full-map':'mini-map'} aria-label="해문시 지도. 금색은 보급품, 분홍색은 집행국, 녹색 테두리는 현재 목표입니다." />;
}

export default function LastCity() {
  const worldRef = useRef<HTMLDivElement>(null), engineRef = useRef<CityEngine | null>(null), savedRef = useRef('');
  const [state,setState] = useState<Snapshot>(null), [error,setError] = useState(''), [modal,setModal] = useState('');
  const [muted,setMuted] = useState(false),[shake,setShake] = useState(true),[low,setLow] = useState(false),[saveError,setSaveError] = useState(false);
  useEffect(()=>{
    if(!worldRef.current)return;
    let profile={};try{profile=sanitizeProfile(JSON.parse(localStorage.getItem(SAVE_KEY)||'{}'));}catch{profile=sanitizeProfile();}
    try{
      const engine=new CityEngine(worldRef.current,profile,(s:Snapshot)=>{
        setState(s);const serialized=JSON.stringify(s.profile);if(serialized!==savedRef.current){try{localStorage.setItem(SAVE_KEY,serialized);savedRef.current=serialized;}catch{setSaveError(true);}}
      },(kind:string)=>setModal(kind));engineRef.current=engine;
      const unregister = registerGameTools((document as any).modelContext, engine);
      return ()=>{unregister();engine.destroy();engineRef.current=null;};
    }catch(e){setError(e instanceof Error?e.message:String(e));}
  },[]);
  const open=(kind:string)=>{engineRef.current?.pause();setModal(kind);};
  const close=()=>{setModal('');engineRef.current?.resume();};
  const sound=(value:boolean)=>{setMuted(value);engineRef.current?.setMuted(value);};
  const started=state && state.status!=='ready', finished=state?.status==='finished';
  const press=(key:string,value:boolean)=>engineRef.current?.setKey(key,value);
  const action=(name:string)=>engineRef.current?.action(name);

  return <main className={`last-city ${started?'in-game':'in-menu'} ${state?.signal==='red'&&state?.phase==='debt'?'red-signal':''}`}>
    <div className="world" ref={worldRef}/><div className="vignette" aria-hidden="true"/><div className="film-grain" aria-hidden="true"/>
    <header className="game-header">
      <div className="wordmark"><span className="monogram">L<span>C</span></span><span>LAST CITY<small>목숨의 가격</small></span></div>
      <div className="session-tag"><i/> {started?state?.phase==='city'?'해문 자유 구역':'도시 청산 대회':'HAEMUN · 해문시'}<span className="session-divider">/</span><span>SOLO · NPC</span></div>
      <div className="header-actions">
        <Button variant="ghost" size="icon" onClick={()=>sound(!muted)} aria-label={muted?'소리 켜기':'소리 끄기'}>{muted?<VolumeX/>:<Volume2/>}</Button>
        <Button variant="ghost" size="icon" onClick={()=>open('help')} aria-label="조작 방법"><CircleHelp/></Button>
        <Button variant="ghost" size="icon" onClick={()=>open(started?'pause':'settings')} aria-label={started?'일시정지':'설정'}>{started?<Pause/>:<Settings2/>}</Button>
      </div>
    </header>

    {!state&&!error&&<div className="connecting"><span className="loading-line"/><p>해문시 입장 준비 중…</p></div>}
    {error&&<section className="error-card"><h1>도시 화면을 시작하지 못했습니다.</h1><p>3D 그래픽을 지원하는 브라우저에서 하드웨어 가속을 켜고 다시 실행해 주세요.</p><details><summary>오류 내용</summary>{error}</details><Button onClick={()=>location.reload()}>다시 연결</Button></section>}

    {state&&!started&&<section className="title-screen">
      <div className="title-content"><p className="eyebrow"><span/> 도시 청산 프로그램 / 참가자 모집 중</p>
        <h1>LAST<br/><span>CITY</span><em>목숨의 가격</em></h1>
        <p className="title-copy">살아남을 것인가.<br/>이 도시를 가질 것인가.</p>
        <div className="start-buttons"><Button className="primary-action" onClick={()=>engineRef.current?.start(false)}><Play fill="currentColor"/> 도시로 들어가기 <ArrowUpRight/></Button><Button variant="ghost" className="secondary-action" onClick={()=>engineRef.current?.start(true)}>대회 바로 참가 <ArrowRight/></Button></div>
        <div className="title-meta"><span>3D 생존 액션</span><b>·</b><span>1인 플레이</span><b>·</b><span>키보드 + 마우스</span></div>
      </div>
      <aside className="entry-brief"><div className="brief-top"><span className="tiny-label">THE CLEARANCE</span><span>01—03</span></div><h2>도시가 곧 경기장이다.</h2>
        <div className="brief-row"><span>01</span><div><strong>연대채무</strong><p>증서를 모아 목숨의 값을 갚으세요.</p></div><Package/></div>
        <div className="brief-row"><span>02</span><div><strong>도시의 심장</strong><p>꺼진 전력망을 복구하세요.</p></div><Zap/></div>
        <div className="brief-row"><span>03</span><div><strong>마지막 배당</strong><p>항만의 마지막 좌석을 확보하세요.</p></div><Car/></div>
        <div className="prize-line"><span>우승 상금</span><strong>20,000 <small>C</small></strong></div>
        <p className="brief-note">동맹과 함께 살아남으면 배당을 나눕니다.<br/>조직 자산은 이 브라우저에 자동 저장됩니다.</p>
      </aside>
      <footer className="menu-footer"><span>HAEMUN AUTONOMOUS ZONE <b>35° 09′ N</b></span><span>PLAYABLE PROTOTYPE <i/> 01.0</span></footer>
    </section>}

    {state&&started&&!finished&&<>
      <section className="mission-panel"><div className="tiny-label"><span className="live-dot"/> {state.phase==='city'?'OPEN WORLD':'CURRENT OBJECTIVE'}</div><h2>{state.objective.title}</h2><p>{state.objective.text}</p>
        {state.phase!=='city'&&<Progress value={state.objective.progress} className="mission-progress" aria-label="현재 목표 진행률"/>}
        <div className="objective-distance"><span>◇ {state.objective.target?.label}</span><b>{Math.round(distance(state.player,state.objective.target||state.player))} m <ChevronRight size={14}/></b></div>
      </section>
      <section className="round-status">
        {state.phase!=='city'?<><div className="round-steps">{['debt','power','escape'].map((p,i)=><span key={p} className={state.phase===p?'active':state.phase==='escape'||state.phase==='power'&&i===0?'complete':''}><b>{i+1}</b>{['채무','전력','탈출'][i]}</span>)}</div>
        {state.phase==='debt'&&<div className={`signal-pill ${state.signal}`}><span/>{state.signal==='green'?'이동 허용':state.signal==='amber'?'곧 정지':'추진 · 조향 · 발포 금지'}<b>{state.signalRemaining}s</b></div>}
        {state.blackout&&<div className="signal-pill red"><Zap size={14}/> VIP 개입 · 정전</div>}</>:<span className="free-roam-label">통제 밖에서, 당신의 방식으로.</span>}
      </section>
      <section className="status-panel"><div className="cash"><span>조직 자금</span><strong>{money(state.profile.cash)} <small>C</small></strong></div>{state.phase!=='city'&&<div className={`timer ${state.time<30?'danger':''}`}><span>남은 시간</span><strong>{time(state.time)}</strong></div>}<div className="wanted"><span>추적 단계</span><div>{[1,2,3].map(i=><Shield key={i} size={16} className={state.wanted>=i-.5?'hot':''}/>)}</div></div></section>
      <aside className="map-panel"><div className="map-heading"><span>해문시</span><b>N ↑</b><Button variant="ghost" size="icon-xs" onClick={()=>open('map')} aria-label="전체 지도 열기"><Map size={14}/></Button></div><CityMap state={state}/><div className="map-footer"><span><i/> 현재 위치</span><span><kbd>M</kbd> 전체 지도</span></div></aside>
      <div className="player-status"><div className="participant"><span>참가자</span><strong>#{String(state.profile.generation).padStart(3,'0')}</strong><span className="player-class">{factionNames[state.profile.faction]}</span></div><div className="health-row"><Heart size={15}/><Progress value={state.player.hp} className="health-progress" aria-label="생명력"/><b>{Math.ceil(state.player.hp)}</b></div><div className="stamina-row"><span>지구력</span><Progress value={state.player.stamina} className="stamina-progress" aria-label="지구력"/></div></div>
      <aside className="weapon-panel">{state.car?<><div className="weapon-label"><Car size={16}/> 탈취 차량</div><div className="ammo-count">{Math.round(Math.abs(state.car.speed)*3.6)}<small>km/h</small></div><div className="weapon-detail">차량 내구도 {Math.ceil(state.car.hp)} <span><kbd>F</kbd> 하차</span></div></>:<><div className="weapon-label"><Crosshair size={16}/> STANDARD / 9MM</div><div className="ammo-count">{state.player.reload>0?'··':String(state.player.ammo).padStart(2,'0')}<small>/ {state.player.reserve}</small></div><div className="weapon-detail">{state.player.reload>0?'재장전 중…':'반자동 권총'}<span><kbd>R</kbd> 재장전</span></div></>}
        <div className="supplies"><span><Heart size={14}/> 의료품 {state.player.meds} <kbd>H</kbd></span><span><Package size={14}/> 증서 {state.player.certificates}</span></div></aside>
      {state.pact&&<div className={`ally-status ${!state.allyAlive?'lost':''}`}><Users size={15}/><span>윤서 {state.allyAlive?'동행 중 · 공동 배당':'탈락'}</span></div>}
      {state.interaction&&<Button className="interaction-prompt" onClick={()=>action('interact')}><kbd>E</kbd>{state.interaction.text}<ChevronRight size={16}/></Button>}
      {!state.interaction&&state.player.carId&&<div className="drive-tip">W 가속 · S 제동/후진 · A D 조향 · Shift 부스트</div>}
      <div className="radio-feed" aria-live="polite">{state.notes.slice(0,2).map((n:any)=><div key={n.id} className={`radio-message ${n.kind}`}><Radio size={14}/><span>{n.text}</span></div>)}</div>
      <footer className="controls-footer"><span><kbd>W A S D</kbd> 이동</span><span><kbd>Shift</kbd> 질주</span><span><kbd>F</kbd> 차량</span><span><kbd>우클릭 드래그</kbd> 시점</span><Button variant="ghost" onClick={()=>open('organization')}><kbd>Tab</kbd> 조직</Button><Button variant="ghost" onClick={()=>open('pause')}><kbd>Esc</kbd> 메뉴</Button></footer>
      <div className="touch-controls"><div className="touch-dpad">{[['KeyW',ArrowUp,'up'],['KeyA',ArrowLeft,'left'],['KeyS',ArrowDown,'down'],['KeyD',ArrowRight,'right']].map(([key,Icon,position]:any)=><button key={key} className={position} aria-label={key+' 이동'} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);press(key,true);}} onPointerUp={()=>press(key,false)} onPointerCancel={()=>press(key,false)}><Icon size={23}/></button>)}</div><div className="touch-actions"><button onClick={()=>action('shoot')} aria-label="가장 가까운 적에게 사격"><Crosshair/></button><button onClick={()=>action('interact')}>E</button><button onClick={()=>action('car')}><Car/></button><button onClick={()=>action('heal')}><Heart/></button></div></div>
    </>}

    {finished&&<section className="result-screen"><div className="result-card"><p className="eyebrow">THE CLEARANCE / RESULT</p>{state.won?<Trophy className="result-icon"/>:<Skull className="result-icon death"/>}<h1>{state.won?'살아남았다.':state.phase==='city'?'다시, 해문으로.':'참가자 탈락.'}</h1><p>{state.result}</p>{state.won&&<div className="result-payout">+{money(state.payout)} <span>C</span></div>}<div className="result-stats"><div><span>경과 시간</span><strong>{time(state.elapsed)}</strong></div><div><span>조직 자금</span><strong>{money(state.profile.cash)} C</strong></div><div><span>누적 우승</span><strong>{state.profile.wins}</strong></div></div><Button className="primary-action" onClick={()=>{engineRef.current?.restart();setModal('');}}>도시로 돌아가기 <ArrowRight/></Button><small>부동산과 조직의 기록이 저장되었습니다.</small></div></section>}

    {saveError&&<div className="save-warning">브라우저 저장을 사용할 수 없어 이번 진행은 창을 닫으면 사라집니다.</div>}
    <Dialog open={!!modal} onOpenChange={v=>{if(!v)close();}}>
      <DialogContent className={`game-dialog ${modal==='map'?'map-dialog':modal==='organization'?'organization-dialog':''}`}>
        <DialogTitle className="dialog-heading">{({pause:'잠시 숨을 고르세요.',settings:'설정',help:'해문시 생존 안내',map:'해문시 전체 지도',organization:'당신의 조직'} as Record<string,string>)[modal]||'해문시'}</DialogTitle>
        <DialogDescription className="dialog-description">{modal==='organization'?'상금을 도시의 자산으로 바꾸세요. 조직은 다음 참가자에게 이어집니다.':modal==='map'?'게임은 일시정지 상태입니다. 녹색 테두리가 다음 목표를 가리킵니다.':modal==='help'?'차량과 동맹을 활용하면 살아남기 쉬워집니다.':'게임 진행과 타이머가 멈춰 있습니다.'}</DialogDescription>
        {modal==='pause'&&<div className="pause-actions"><Button className="primary-action" onClick={close}><Play size={17}/> 계속하기</Button><Button variant="outline" onClick={()=>setModal('map')}><Map/> 전체 지도</Button><Button variant="outline" onClick={()=>setModal('organization')}><Building2/> 조직 관리</Button><Button variant="outline" onClick={()=>setModal('help')}><CircleHelp/> 조작 방법과 규칙</Button><Button variant="outline" onClick={()=>setModal('settings')}><Settings2/> 소리·화면 설정</Button></div>}
        {modal==='settings'&&<div className="settings-list"><label><span><strong>소리</strong><small>도시의 저음과 사격·상호작용 효과음</small></span><Switch checked={!muted} onCheckedChange={v=>sound(!v)}/></label><label><span><strong>화면 흔들림</strong><small>피격 시 카메라 효과</small></span><Switch checked={shake} onCheckedChange={v=>{setShake(v);if(engineRef.current)engineRef.current.shake=v;}}/></label><label><span><strong>저사양 모드</strong><small>그림자와 해상도를 줄여 성능을 높입니다.</small></span><Switch checked={low} onCheckedChange={v=>{setLow(v);engineRef.current?.setQuality(v);}}/></label><Button className="primary-action" onClick={close}>적용하고 돌아가기</Button></div>}
        {modal==='help'&&<div className="help-body"><div className="key-table">{[['W A S D','도보 이동 / 차량 가속·제동·조향'],['Shift','질주 / 차량 부스트'],['마우스 + 좌클릭','조준 + 사격 (도보 상태)'],['우클릭 드래그 / 휠','시점 회전 / 거리 조정'],['E','증서·밀수품 확보 / 목표 상호작용'],['F','차량 탈취 / 저속에서 하차'],['R / H','재장전 / 응급 처치'],['M / Tab / Esc','지도 / 조직 / 일시정지']].map(([key,value])=><div key={key}><kbd>{key}</kbd><span>{value}</span></div>)}</div><p><strong>대회 규칙</strong><br/>보관함에서 증서 100을 확보하고 중앙 상환소에 납부하세요. 이후 변전소 3곳을 복구하고 북동쪽 항만으로 탈출합니다.</p><p><strong>적색 신호</strong><br/>채무 라운드에서 녹색 25초 → 황색 3초 → 적색 7초가 반복됩니다. 적색 중 추진·조향·발포는 25 피해를 받습니다. 차량의 관성과 제동은 허용됩니다.</p><p><strong>윤서와 동맹</strong><br/>시작 지점의 금색 옷을 입은 정비공에게 다가가 E를 누르세요. 함께 싸우고 전력 복구 때 치료해 줍니다. 생존하면 상금의 절반을 나눕니다.</p><p className="scope-note">이 버전은 NPC와 플레이하는 싱글플레이 프로토타입입니다. 조직 자산은 현재 브라우저에 저장되며, 진행 중인 대회는 새로고침하면 종료됩니다.</p></div>}
        {modal==='map'&&state&&<><CityMap state={state} expanded/><div className="map-legend"><span><i className="mint"/> 현재 목표</span><span><i className="gold"/> 보급품·시설</span><span><i className="pink"/> 집행국</span></div></>}
        {modal==='organization'&&state&&<div className="organization-body"><div className="org-summary"><div><span>운용 자금</span><strong>{money(state.profile.cash)} <small>C</small></strong></div><div><span>영향력</span><strong>{state.profile.influence}</strong></div><div><span>우승</span><strong>{state.profile.wins}</strong></div></div>{state.phase!=='city'&&<p className="scope-note">시설 구매와 진영 선택은 도시로 돌아온 뒤 가능합니다.</p>}
          <div className="asset-list">{ASSETS.map((a:any,i:number)=>{const owned=state.profile.assets.includes(a.id),Icon=[Wrench,Heart,Radio][i];return <div className="asset" key={a.id}><div className="asset-icon"><Icon/></div><div><h3>{a.name}</h3><p>{a.description}</p></div><Button variant={owned?'ghost':'outline'} disabled={owned||state.phase!=='city'||state.profile.cash<a.cost} onClick={()=>engineRef.current?.buy(a.id)}>{owned?<><Check size={15}/> 보유</>:<>{money(a.cost)} C</>}</Button></div>;})}</div>
          <h3 className="org-section-label">어느 편에 설 것인가</h3><div className="faction-choices">{[['resistance','해방 연합','윤서와 공동 탈출 시 영향력 +15',Flag],['organizer','집행국 협력','전력 복구 후 우승 시 영향력 +15',Shield]].map(([id,name,desc,Icon]:any)=><Button key={id} variant="outline" className={state.profile.faction===id?'selected':''} disabled={state.phase!=='city'} onClick={()=>engineRef.current?.faction(id)}><Icon/><span><strong>{name}</strong><small>{desc}</small></span>{state.profile.faction===id&&<Check/>}</Button>)}</div>
          <h3 className="org-section-label">조직의 기록</h3>{state.profile.history.length?<ul className="history-list">{state.profile.history.map((h:string,i:number)=><li key={i}>{h}</li>)}</ul>:<p className="empty-history">첫 번째 생존자가 될 준비를 하세요.</p>}<p className="local-save">이 브라우저에 자동 저장 · 현재 참가자 #{String(state.profile.generation).padStart(3,'0')}</p></div>}
      </DialogContent>
    </Dialog>
  </main>;
}
