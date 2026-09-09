import * as T from 'three';
import { createCharacter, animateCharacter } from '../game/character.js';
import { signal } from './rules.js';
export function createArena(host, state, update) {
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;
  host.appendChild(renderer.domElement); const scene=new T.Scene();scene.background=new T.Color('#162b35');scene.fog=new T.Fog('#162b35',55,135);
  const camera=new T.PerspectiveCamera(52,1,0.1,180);const mat=c=>new T.MeshStandardMaterial({color:c,roughness:0.78});
  scene.add(new T.HemisphereLight('#daefff','#4e4c40',2));const sun=new T.DirectionalLight('#ffe1b0',3);sun.position.set(-20,40,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40});scene.add(sun);
  function box(w,h,d,x,y,z,c){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
  const floor=box(36,1,64,0,-0.6,0,'#baa684');box(1,17,64,-18,8,0,'#5c858a');box(1,17,64,18,8,0,'#5c858a');box(36,17,1,0,8,-32,'#84a6a3');box(36,17,1,0,8,32,'#405e69');
  for(let z=-28;z<32;z+=8){box(0.16,13,0.18,-17.4,6,z,'#a5c7bd');box(0.16,13,0.18,17.4,6,z,'#a5c7bd');}
  box(33,0.03,0.2,0,0.02,-22,'#e44f78');box(33,0.03,0.2,0,0.02,23,'#f7efda');
  const player=createCharacter('#318e7a',false,true,mat);scene.add(player);
  const npcs=[];for(let i=0;i<20;i++){const n=createCharacter('#347966',false,false,mat);n.position.set((i%5-2)*5,0,12+Math.floor(i/5)*3);scene.add(n);npcs.push(n);}
  for(const side of [-1,1])for(let z=-24;z<=24;z+=16){const g=createCharacter('#d84471',true,false,mat);g.position.set(side*16,0,z);g.rotation.y=-side*Math.PI/2;scene.add(g);}
  const doll=createCharacter('#ed9e39',false,false,mat);doll.scale.setScalar(3.1);doll.position.set(0,0,-28);scene.add(doll);
  const bridge=[];for(let i=0;i<8;i++)for(let j=0;j<2;j++){const p=box(3.5,0.18,4,j===0?-2:2,0,22-(i+1)*5.4,'#5ac7d3');p.material.transparent=true;p.material.opacity=0.65;bridge.push(p);}
  const defender=createCharacter('#204e47',false,false,mat);scene.add(defender);
  const outline=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(-10,0.05,24),new T.Vector3(10,0.05,24),new T.Vector3(10,0.05,0),new T.Vector3(0,0.05,-24),new T.Vector3(-10,0.05,0),new T.Vector3(-10,0.05,24)]),new T.LineBasicMaterial({color:'#fff4d0'}));scene.add(outline);
  const ring=new T.Mesh(new T.RingGeometry(2.7,3,48),new T.MeshBasicMaterial({color:'#ffdf8c',side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(0,0.05,-22);scene.add(ring);
  let raf,last=performance.now();const resize=()=>{renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(host);resize();
  function frame(now){const dt=Math.min((now-last)/1000,0.05);last=now;update(dt);const s=state();floor.visible=s.round!==4;bridge.forEach((p,i)=>{p.visible=s.round===4;p.material.color.set(s.elapsed<4&&s.bridge[Math.floor(i/2)]===i%2?'#d7ffae':'#5ac7d3');});
    outline.visible=ring.visible=s.round===5;defender.visible=s.round===5;defender.position.set(s.opponentX,0,s.opponentZ);defender.lookAt(s.x,0,s.z);animateCharacter(defender,dt,s.status==='playing'?4:0,false);
    player.position.set(s.x,s.status==='lost'?-0.5:0,s.z);player.rotation.z=s.status==='lost'?Math.PI/2:0;animateCharacter(player,dt,s.status==='playing'&&(s.round===0||s.round===5)?s.speed||0:0,false);
    npcs.forEach((n,i)=>{n.visible=s.round===0;if(s.status==='ready')n.position.z=12+Math.floor(i/5)*3;if(s.status==='playing'&&signal(s)==='green')n.position.z=Math.max(-23,n.position.z-dt*(3+i%3));animateCharacter(n,dt,s.status==='playing'&&signal(s)==='green'?4:0,false);n.rotation.y=Math.PI;});
    doll.visible=s.round===0;doll.rotation.y=signal(s)==='green'?Math.PI:0;
    const reveal=s.round===4&&(s.elapsed<4||s.status==='ready');const target=reveal?new T.Vector3(0,45,35):new T.Vector3(s.x*0.5,s.round===4?15:10,s.z+16);camera.position.lerp(target,1-Math.exp(-dt*3));camera.lookAt(s.x*0.4,1,reveal?0:s.z-8);renderer.render(scene,camera);raf=requestAnimationFrame(frame);
  }camera.position.set(12,19,39);raf=requestAnimationFrame(frame);
  return ()=>{cancelAnimationFrame(raf);observer.disconnect();scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of [].concat(o.material))m.dispose();}});renderer.dispose();renderer.domElement.remove();};
}
