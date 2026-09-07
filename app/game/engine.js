import * as THREE from 'three';
import { BUILDINGS, PLACES, PLANTS, createGame, step, shoot, interact, enterCar, heal, reload, startTournament, buyAsset, chooseFaction, objective, distance, clamp, seeded, note } from './model.js';

const PALETTE = ['#4b6467', '#697573', '#3c535b', '#827d70', '#4b5e65'];
export class CityEngine {
  constructor(container, profile, onUpdate, onPause) {
    this.container = container; this.onUpdate = onUpdate; this.onPause = onPause;
    this.game = createGame(profile); this.keys = {}; this.mouse = new THREE.Vector2(0, 0); this.aim = { x: 0, z: -20 };
    this.yaw = 0; this.zoom = 25; this.running = true; this.shooting = false; this.dragging = false;
    this.muted = false; this.shake = true; this.quality = 'high'; this.lastHud = 0; this.clock = new THREE.Clock(); this.visualTime = 0;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7)); this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3; container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label', '해문시 3D 게임 화면. WASD 이동, 마우스 조준, E 상호작용, F 차량 탑승.');
    this.renderer.domElement.tabIndex = 0;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#29454d'); this.scene.fog = new THREE.Fog('#29454d', 85, 250);
    this.camera = new THREE.PerspectiveCamera(52, 1, .1, 700); this.camera.position.set(36, 36, 65);
    this.raycaster = new THREE.Raycaster(); this.groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0), -1);
    this.hemi = new THREE.HemisphereLight('#bddede', '#303e38', 2.6); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#ffcf9c', 3.7); this.sun.position.set(-70, 100, -65); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048,2048); Object.assign(this.sun.shadow.camera,{left:-75,right:75,top:75,bottom:-75,near:1,far:250});
    this.sun.shadow.bias = -.001; this.sun.shadow.normalBias = .04; this.scene.add(this.sun, this.sun.target);
    this.staticBatches = new Map(); this.materials = new Map(); this.sharedBox = new THREE.BoxGeometry(1,1,1);
    this.buildCity(); this.actors = new Map(); this.carMeshes = new Map(); this.crateMeshes = new Map(); this.markers = [];
    this.playerMesh = this.person('#84cfb1', false, true); this.scene.add(this.playerMesh);
    this.rebuildActors(); this.buildMarkers(); this.tracerGroup = new THREE.Group(); this.scene.add(this.tracerGroup);
    this.targetMarker = this.marker('#9fe0bb', '목표', 2.3); this.scene.add(this.targetMarker);
    this.crosshair = new THREE.Mesh(new THREE.RingGeometry(.24,.31,24),new THREE.MeshBasicMaterial({color:'#faf4df',transparent:true,opacity:.8,side:THREE.DoubleSide,depthTest:false}));
    this.crosshair.rotation.x = -Math.PI/2; this.crosshair.renderOrder=50; this.scene.add(this.crosshair);
    this.bindEvents(); this.resize(); this.resizeObserver = new ResizeObserver(()=>this.resize()); this.resizeObserver.observe(container);
    this.emit(); this.frame();
  }
  material(color, glow=0) {
    const key = `${color}-${glow}`;
    if(!this.materials.has(key)) this.materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.78,metalness:.12,emissive:color,emissiveIntensity:glow}));
    return this.materials.get(key);
  }
  box(w,h,d,x,y,z,color,glow=0,group=null) {
    if(group) { const mesh=new THREE.Mesh(this.sharedBox,this.material(color,glow)); mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh; }
    const key=`${color}-${glow}`; if(!this.staticBatches.has(key)) this.staticBatches.set(key,{material:this.material(color,glow),items:[]});
    this.staticBatches.get(key).items.push({w,h,d,x,y,z});
  }
  flushBoxes() {
    const m=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new THREE.Vector3(),s=new THREE.Vector3();
    this.staticBatches.forEach(batch=>{
      const mesh=new THREE.InstancedMesh(this.sharedBox,batch.material,batch.items.length);
      batch.items.forEach((b,i)=>{m.compose(p.set(b.x,b.y,b.z),q,s.set(b.w,b.h,b.d));mesh.setMatrixAt(i,m);});
      mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();this.scene.add(mesh);
    }); this.staticBatches.clear();
  }
  textSprite(text,color='#f6eee0',width=256,height=72) {
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(11,22,27,.85)';ctx.fillRect(0,0,width,height);
    ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(1,1,width-2,height-2);
    ctx.fillStyle=color;ctx.font=`600 ${height*.37}px "Malgun Gothic", sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,width/2,height/2,width-16);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));sprite.scale.set(width/38,height/38,1);return sprite;
  }
  buildCity() {
    const random=seeded(790);
    this.box(315,.7,315,0,-.5,0,'#2a393c'); this.box(2000,.4,2000,0,-1.4,0,'#284952');
    for(const r of [-120,-60,0,60,120]) {
      this.box(15,.12,292,r,0,0,'#26373b');this.box(292,.12,15,0,.005,r,'#26373b');
      for(const edge of [-1,1]) { this.box(.18,.09,288,r+edge*6,.12,0,'#718076');this.box(288,.09,.18,0,.12,r+edge*6,'#718076'); }
      for(let t=-138;t<140;t+=9) if(Math.abs(t%60)>10) {this.box(.14,.04,3.7,r,.11,t,'#c3af77');this.box(3.7,.04,.14,t,.12,r,'#c3af77');}
      for(const cross of [-120,-60,0,60,120]) for(let stripe=-4;stripe<=4;stripe+=1.6) {
        this.box(.8,.03,3,r+stripe,.13,cross+10,'#aeb6a8');this.box(3,.03,.8,r+10,.13,cross+stripe,'#aeb6a8');
      }
    }
    BUILDINGS.forEach((b,i)=>{
      const color=PALETTE[b.style];this.box(b.w+.8,.5,b.d+.8,b.x,.25,b.z,'#627372');this.box(b.w,b.h,b.d,b.x,b.h/2+.5,b.z,color);
      this.box(b.w+.5,.4,b.d+.5,b.x,b.h+.65,b.z,'#8a8e80');
      this.box(b.w*.5,1.2,b.d*.35,b.x,b.h+1.4,b.z,'#34464d');
      for(let y=3;y<b.h-1;y+=3.2) for(let k=-b.w/2+2;k<b.w/2-1;k+=3.2) {
        const lit=random()>.35, c=lit?'#d8b87a':'#243940';
        this.box(1.35,1.45,.12,b.x+k,y,b.z+b.d/2+.08,c,lit?.35:0);
        this.box(1.35,1.45,.12,b.x+k,y,b.z-b.d/2-.08,c,lit?.35:0);
        this.box(.12,1.45,1.3,b.x+b.w/2+.08,y,b.z+k,c,lit?.35:0);
      }
      this.box(b.w*.7,.5,1.4,b.x,2.9,b.z+b.d/2+.5,['#db697b','#73b6ae','#b49e62'][i%3],.3);
      if(i%8===0) {const sign=this.textSprite(['해문은행','은하호텔','HAEMUN','중앙상가','해방방송','청산금융','NIGHT MARKET','LAST CITY'][i/8],'#edce9a',384,80);sign.position.set(b.x,b.h+3,b.z);sign.scale.multiplyScalar(.9);this.scene.add(sign);}
      if(i%3===0) this.box(.3,4,.3,b.x,b.h+3,b.z,'#93a0a0');
    });
    for(const x of [-120,-60,0,60,120]) for(let z=-135;z<140;z+=30) {
      if(Math.abs(z%60)<12)continue;
      this.box(.18,6,.18,x+7.3,3,z,'#283d41');this.box(2,.15,.22,x+6.5,6,z,'#6e7d79');this.box(.7,.08,.32,x+5.7,5.9,z,'#ffe1a7',2);
      this.box(.25,6,.25,x-7.3,3,z+8,'#283d41');
    }
    // Harbor cranes, cargo stacks and the breakwater remain real world geometry.
    for(let i=0;i<9;i++) {const x=157+(i%3)*12,z=-100+Math.floor(i/3)*32;this.box(10,4,23,x,1.6,z,['#657b75','#905c50','#8e7c54'][i%3]);this.box(10,4,23,x,5.6,z,['#905c50','#556d73','#536c61'][i%3]);}
    for(const z of [-100,-10,80]) {
      this.box(3,42,3,185,20,z,'#bea16b');this.box(54,2,3,169,41,z,'#bea16b');this.box(.18,27,.18,152,27,z,'#445657');this.box(7,5,6,178,37,z,'#40575c');
    }
    this.box(52,.7,300,174,-.3,0,'#4a5b5c');
    for(let z=-144;z<145;z+=7)this.box(1.2,1.5,1.2,143,.75,z,'#839386');
    this.box(12,1.5,15,120,.75,-120,'#344a4e');
    for(let i=0;i<24;i++){const x=-220+random()*410,z=-215-random()*90;this.box(12+random()*20,25+random()*80,15+random()*15,x,20,z,'#344e57');}
    const sunDisk=new THREE.Mesh(new THREE.SphereGeometry(22,32,16),new THREE.MeshBasicMaterial({color:'#f4b67d',fog:false}));sunDisk.position.set(-190,90,-330);this.scene.add(sunDisk);
    const billboard=new THREE.Group();this.box(16,7,.7,0,14,-10,'#182c31',0,billboard);this.box(.5,10,.5,-6,6,-10,'#3c5459',0,billboard);this.box(.5,10,.5,6,6,-10,'#3c5459',0,billboard);
    const title=this.textSprite('LAST CITY','#f4c391',768,192);title.position.set(0,14,-9.5);title.scale.set(15,3.75,1);billboard.add(title);this.scene.add(billboard);
    this.flushBoxes();
  }
  person(color,guard=false,player=false) {
    const group=new THREE.Group();
    const torso=this.box(.72,.86,.43,0,1.24,0,color,0,group);
    this.box(.1,.7,.46,0,1.24,0,'#d7e3d7',0,group);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.28,10,8),this.material(guard?'#202d35':'#d5b99b'));head.position.y=1.96;group.add(head);head.castShadow=true;
    if(guard){const hood=new THREE.Mesh(new THREE.SphereGeometry(.35,10,8),this.material(color));hood.position.set(0,1.95,-.08);group.add(hood);this.box(.13,.05,.03,0,2,.285,'#e6e5d8',.3,group);}
    else this.box(.53,.15,.48,0,2.16,-.04,'#263435',0,group);
    const legs=[this.box(.25,.8,.28,-.21,.4,0,color,0,group),this.box(.25,.8,.28,.21,.4,0,color,0,group)];
    const arms=[this.box(.21,.7,.26,-.49,1.24,0,color,0,group),this.box(.21,.7,.26,.49,1.24,0,color,0,group)];
    this.box(.2,.18,.7,.48,1.02,.34,'#1e2c31',0,group);
    group.userData={legs,arms,torso};
    if(player){const ring=new THREE.Mesh(new THREE.RingGeometry(.78,.89,32),new THREE.MeshBasicMaterial({color:'#9ff6cf',transparent:true,opacity:.9,side:THREE.DoubleSide,depthTest:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.12;ring.renderOrder=100;group.add(ring);
      const marker=new THREE.Mesh(new THREE.OctahedronGeometry(.19),new THREE.MeshBasicMaterial({color:'#c2ffe2',depthTest:false}));marker.position.y=2.9;marker.renderOrder=100;group.add(marker);
    }
    return group;
  }
  car(color) {
    const g=new THREE.Group();
    this.box(2.3,.65,4.8,0,.75,0,color,0,g);this.box(2.2,.2,4.7,0,.35,0,'#15272b',0,g);
    this.box(1.92,.8,2.55,0,1.45,-.3,color,0,g);
    this.box(1.8,.58,.07,0,1.45,1,'#203d49',.08,g);this.box(1.8,.5,.07,0,1.45,-1.61,'#203d49',.08,g);
    this.box(.06,.52,2.18,-.98,1.5,-.3,'#254652',0,g);this.box(.06,.52,2.18,.98,1.5,-.3,'#254652',0,g);
    this.box(1.9,.1,2.5,0,1.9,-.3,color,0,g);
    for(const x of [-1.17,1.17])for(const z of [-1.55,1.5]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.27,12),this.material('#17252a'));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.48,z);g.add(wheel);}
    for(const x of [-.73,.73]) {this.box(.45,.22,.05,x,.9,2.43,'#ffe3ad',2,g);this.box(.48,.16,.05,x,.88,-2.43,'#fa5473',1.5,g);}
    return g;
  }
  rebuildActors() {
    for(const m of this.actors.values())this.scene.remove(m);for(const m of this.carMeshes.values())this.scene.remove(m);for(const m of this.crateMeshes.values())this.scene.remove(m);
    this.actors.clear();this.carMeshes.clear();this.crateMeshes.clear();
    this.game.npcs.forEach(n=>{const m=this.person(n.role==='guard'?'#dd5c80':n.role==='ally'?'#dec583':'#5d9b94',n.role==='guard');this.scene.add(m);this.actors.set(n.id,m);});
    this.game.cars.forEach(c=>{const m=this.car(c.color);this.scene.add(m);this.carMeshes.set(c.id,m);});
    this.game.crates.forEach(c=>this.addCrate(c));
  }
  addCrate(c) {
    const m=new THREE.Group();this.box(1.35,.8,1.1,0,.5,0,'#486157',0,m);this.box(1.4,.12,1.15,0,.95,0,'#d5b67e',.4,m);this.box(.18,.83,1.14,0,.54,0,'#d5b67e',.3,m);
    const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.25),new THREE.MeshBasicMaterial({color:'#f5d193'}));gem.position.y=1.6;m.add(gem);m.userData.gem=gem;m.position.set(c.x,0,c.z);this.scene.add(m);this.crateMeshes.set(c.id,m);
  }
  marker(color,text,size=3) {
    const group=new THREE.Group();
    const ring=new THREE.Mesh(new THREE.RingGeometry(size-.16,size,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.15;group.add(ring);
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(.07,.12,8,8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.35,depthWrite:false}));beam.position.y=4;group.add(beam);
    const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.5),new THREE.MeshBasicMaterial({color}));gem.position.y=4;group.add(gem);
    const label=this.textSprite(text,color);label.position.y=6;group.add(label);group.userData={gem,label};return group;
  }
  buildMarkers() {
    Object.entries(PLACES).forEach(([id,p])=>{const m=this.marker(p.color,p.label);m.position.set(p.x,0,p.z);this.scene.add(m);this.markers.push({id,mesh:m});});
    PLANTS.forEach(p=>{const m=this.marker('#dabd77',p.label,3);m.position.set(p.x,0,p.z);this.box(1.5,1.6,1.2,2,1,0,'#3d6262',0,m);this.box(1.1,.45,.06,2,1.4,.63,'#e8c586',1,m);this.scene.add(m);this.markers.push({id:p.id,mesh:m,plant:true});});
    const truck=this.car('#f0dab3');truck.scale.set(1.3,1.2,1.2);truck.position.set(120,1.5,-120);this.scene.add(truck);
  }
  bindEvents() {
    const c=this.renderer.domElement;this.listeners=[];
    const listen=(target,name,fn,options)=>{target.addEventListener(name,fn,options);this.listeners.push(()=>target.removeEventListener(name,fn,options));};
    listen(window,'keydown',e=>{
      if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
      if(['KeyW','KeyA','KeyS','KeyD','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
      this.keys[e.code]=true;if(e.repeat)return;
      if(e.code==='Escape'){if(this.game.status==='playing'){this.pause();this.onPause('pause');}return;}
      if(this.game.status!=='playing')return;
      if(e.code==='KeyE')this.action('interact'); if(e.code==='KeyF')this.action('car');if(e.code==='KeyR')this.action('reload');if(e.code==='KeyH')this.action('heal');
      if(e.code==='KeyM'){this.pause();this.onPause('map');}if(e.code==='Tab'){e.preventDefault();this.pause();this.onPause('organization');}
    });
    listen(window,'keyup',e=>{this.keys[e.code]=false;});
    listen(c,'contextmenu',e=>e.preventDefault());
    listen(c,'pointerdown',e=>{if(this.game.status!=='playing')return;if(e.pointerType==='touch')return;if(e.button===2)this.dragging=true;if(e.button===0)this.shooting=true;c.focus();});
    listen(window,'pointerup',()=>{this.shooting=false;this.dragging=false;});
    listen(window,'pointermove',e=>{const rect=c.getBoundingClientRect();this.mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);if(this.dragging)this.yaw-=e.movementX*.006;});
    listen(c,'wheel',e=>{e.preventDefault();this.zoom=clamp(this.zoom+e.deltaY*.015,16,43);},{passive:false});
    listen(window,'blur',()=>{this.keys={};this.shooting=false;if(this.game.status==='playing'){this.pause();this.onPause('pause');}});
    listen(document,'visibilitychange',()=>{if(document.hidden&&this.game.status==='playing'){this.pause();this.onPause('pause');}});
  }
  resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  start(tournament=false){if(this.game.status==='ready'){this.game.status='playing';if(tournament)startTournament(this.game);}this.resume();this.initAudio();this.emit();}
  pause(){if(this.game.status==='playing')this.game.status='paused';this.keys={};this.shooting=false;this.dragging=false;this.emit();}
  resume(){if(this.game.status==='paused')this.game.status='playing';this.clock.getDelta();this.renderer.domElement.focus();this.emit();}
  restart(){this.game=createGame(this.game.profile);this.game.status='playing';this.keys={};this.yaw=0;this.rebuildActors();this.emit();}
  action(name){let success=false;if(name==='interact')success=interact(this.game);if(name==='car')success=enterCar(this.game);if(name==='heal')success=heal(this.game);if(name==='reload')success=reload(this.game);
    if(name==='shoot'){const enemy=this.game.npcs.filter(n=>n.alive&&n.hostile&&distance(n,this.game.player)<45).sort((a,b)=>distance(a,this.game.player)-distance(b,this.game.player))[0];success=shoot(this.game,enemy||this.aim);}
    if(success)this.tone(name==='shoot'?100:name==='car'?180:600,.05,.035);this.emit();return success;
  }
  buy(id){const result=buyAsset(this.game,id);this.emit();return result;}
  faction(id){const result=chooseFaction(this.game,id);this.emit();return result;}
  setKey(key,value){this.keys[key]=value;}
  setQuality(low){this.quality=low?'low':'high';this.renderer.setPixelRatio(low?1:Math.min(window.devicePixelRatio,1.7));this.renderer.shadowMap.enabled=!low;this.resize();}
  initAudio(){try{if(!this.audio){this.audio=new (window.AudioContext||window.webkitAudioContext)();this.master=this.audio.createGain();this.master.gain.value=.14;this.master.connect(this.audio.destination);this.drone=this.audio.createOscillator();this.drone.type='sine';this.drone.frequency.value=48;const gain=this.audio.createGain();gain.gain.value=.12;this.drone.connect(gain);gain.connect(this.master);this.drone.start();}this.audio.resume();}catch{}}
  tone(freq,duration=.1,gain=.06){if(this.muted||!this.audio)return;const osc=this.audio.createOscillator(),vol=this.audio.createGain();osc.type=freq<150?'sawtooth':'sine';osc.frequency.setValueAtTime(freq,this.audio.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(20,freq*.3),this.audio.currentTime+duration);vol.gain.setValueAtTime(gain,this.audio.currentTime);vol.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+duration);osc.connect(vol);vol.connect(this.master);osc.start();osc.stop(this.audio.currentTime+duration+.01);}
  setMuted(value){this.muted=value;if(this.master)this.master.gain.value=value?0:.14;}
  emit(){const g=this.game,o=objective(g);this.onUpdate({phase:g.phase,status:g.status,player:{...g.player},profile:{...g.profile,assets:[...g.profile.assets],history:[...g.profile.history]},time:g.time,elapsed:g.elapsed,wanted:g.wanted,signal:g.signal,signalRemaining:g.signalRemaining,blackout:g.blackout,pact:g.pact,allyAlive:g.npcs.some(n=>n.id==='ally'&&n.alive),notes:[...g.notes],objective:o,interaction:g.interaction,won:g.won,payout:g.payout,result:g.result,kills:g.kills,activated:[...g.activated],alive:g.npcs.filter(n=>n.alive&&n.role!=='guard').length+1,car:g.cars.find(c=>c.id===g.player.carId)||null,map:{npcs:g.npcs.map(n=>({x:n.x,z:n.z,role:n.role,alive:n.alive})),crates:g.crates.filter(c=>!c.taken).map(c=>({x:c.x,z:c.z})),cars:g.cars.filter(c=>c.hp>0).map(c=>({x:c.x,z:c.z}))}});}
  frame=()=>{
    if(!this.running)return;this.raf=requestAnimationFrame(this.frame);const dt=Math.min(this.clock.getDelta(),.05);this.visualTime+=dt;
    const g=this.game,p=g.player;
    this.raycaster.setFromCamera(this.mouse,this.camera);const aimPoint=new THREE.Vector3();
    if(this.raycaster.ray.intersectPlane(this.groundPlane,aimPoint))this.aim={x:aimPoint.x,z:aimPoint.z};
    const forward=(this.keys.KeyW||this.keys.ArrowUp?1:0)-(this.keys.KeyS||this.keys.ArrowDown?1:0),right=(this.keys.KeyD||this.keys.ArrowRight?1:0)-(this.keys.KeyA||this.keys.ArrowLeft?1:0);
    step(g,dt,{forward,right,sprint:!!this.keys.ShiftLeft,yaw:this.yaw,aiming:this.shooting});
    if(this.shooting&&shoot(g,this.aim))this.tone(85,.065,.12);
    const visual=this.visualTime, menu=g.status==='ready';
    this.playerMesh.visible=!p.carId;this.playerMesh.position.set(p.x,0,p.z);this.playerMesh.rotation.y=p.angle;
    this.animatePerson(this.playerMesh,visual,!!(forward||right)&&g.status==='playing');
    for(const n of g.npcs){const m=this.actors.get(n.id);if(!m)continue;m.position.set(n.x,n.alive?0:.3,n.z);m.rotation.y=n.angle;m.rotation.z=n.alive?0:Math.PI/2;this.animatePerson(m,visual+Number(n.id.split('-')[1]||0),n.alive&&g.status==='playing'&&n.role!=='ally');}
    for(const c of g.cars){const m=this.carMeshes.get(c.id);m.position.set(c.x,0,c.z);m.rotation.y=c.angle;if(c.hp<=0)m.rotation.z=.06;}
    for(const c of g.crates){if(!this.crateMeshes.has(c.id))this.addCrate(c);const m=this.crateMeshes.get(c.id);m.visible=!c.taken;m.userData.gem.rotation.y=visual;m.userData.gem.position.y=1.6+Math.sin(visual*2)*.12;}
    for(const marker of this.markers){marker.mesh.userData.gem.rotation.y=visual*.7;marker.mesh.visible=marker.plant?(g.phase==='power'||g.phase==='city')&&!g.activated.includes(marker.id):marker.id==='home'?g.phase==='city':marker.id==='gate'?g.phase==='city':marker.id==='bank'?g.phase==='debt':g.phase==='escape';}
    const o=objective(g);if(o.target){this.targetMarker.position.set(o.target.x,0,o.target.z);this.targetMarker.visible=g.status!=='ready';this.targetMarker.userData.label.visible=false;this.targetMarker.userData.gem.position.y=5+Math.sin(visual*3)*.2;}
    this.crosshair.visible=g.status==='playing'&&!p.carId;this.crosshair.position.set(this.aim.x,.15,this.aim.z);
    // Tracer meshes are disposed each frame; shared city resources remain owned until teardown.
    for(const line of [...this.tracerGroup.children]){this.tracerGroup.remove(line);line.geometry.dispose();line.material.dispose();}
    for(const b of g.bullets){const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(b.x,1.25,b.z),new THREE.Vector3(b.tx,1.1,b.tz)]);const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:b.enemy?'#f5788d':b.ally?'#9ce9cc':'#ffdda0',transparent:true,opacity:.95}));this.tracerGroup.add(line);}
    const cameraTarget=new THREE.Vector3(p.x,1.8,p.z),zoom=this.zoom+(p.carId?9:0);
    let cameraPosition=new THREE.Vector3(p.x+Math.sin(this.yaw)*zoom,p.carId?29:24,p.z+Math.cos(this.yaw)*zoom);
    if(menu){const a=visual*.028+.4;cameraPosition.set(Math.sin(a)*65,43,Math.cos(a)*65+3);cameraTarget.set(0,4,0);}
    if(this.shake&&g.lastDamage>0){cameraPosition.x+=Math.sin(visual*100)*g.lastDamage*.6;cameraPosition.z+=Math.cos(visual*88)*g.lastDamage*.6;}
    this.camera.position.lerp(cameraPosition,1-Math.exp(-dt*5));this.camera.lookAt(cameraTarget);
    this.sun.position.set(p.x-70,100,p.z-65);this.sun.target.position.set(p.x,0,p.z);this.sun.target.updateMatrixWorld();
    this.hemi.intensity=THREE.MathUtils.lerp(this.hemi.intensity,g.blackout?.55:2.6,dt*3);this.sun.intensity=THREE.MathUtils.lerp(this.sun.intensity,g.blackout?.35:3.7,dt*3);
    this.renderer.render(this.scene,this.camera);
    this.lastHud+=dt;if(this.lastHud>.1){this.lastHud=0;this.emit();}
  };
  animatePerson(mesh,t,moving){const swing=moving?Math.sin(t*11)*.45:0;mesh.userData.legs?.forEach((m,i)=>m.rotation.x=swing*(i?1:-1));mesh.userData.arms?.forEach((m,i)=>m.rotation.x=-swing*(i?1:-1));}
  destroy(){this.running=false;cancelAnimationFrame(this.raf);this.listeners.forEach(f=>f());this.resizeObserver.disconnect();this.audio?.close();const geos=new Set(),mats=new Set(),textures=new Set();this.scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)for(const mat of Array.isArray(o.material)?o.material:[o.material]){mats.add(mat);if(mat.map)textures.add(mat.map);}});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());this.renderer.dispose();this.renderer.domElement.remove();}
}
