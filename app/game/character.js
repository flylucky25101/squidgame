import * as THREE from 'three';

export function createCharacter(color, guard, player, material, armed = true) {
  const root = new THREE.Group(),
    body = new THREE.Group();
  root.add(body);
  const capsule = (r, length, x, y, z, c, parent = body) => {
    const m = new THREE.Mesh(
      new THREE.CapsuleGeometry(r, length, 4, 8),
      material(c),
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const box = (w, h, d, x, y, z, c, parent = body) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(c));
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const skin = guard ? '#18292e' : '#d7ae8a';
  const torso = capsule(0.32, 0.4, 0, 1.32, 0, color);
  torso.scale.set(1.12, 1, 0.7);
  box(0.64, 0.11, 0.44, 0, 0.94, 0, '#263638');
  box(0.06, 0.72, 0.02, 0, 1.35, 0.238, '#e7e6d4');
  box(0.21, 0.16, 0.035, -0.17, 1.51, 0.255, player ? '#f1e8cb' : '#34494a');
  box(0.15, 0.055, 0.04, -0.17, 1.51, 0.28, '#233b3d');
  box(0.34, 0.43, 0.19, 0, 1.3, -0.3, '#354b48');
  box(0.14, 0.2, 0.13, 0.39, 1.02, 0, '#213237');
  capsule(0.1, 0.08, 0, 1.79, 0, skin);
  const head = capsule(0.245, 0.13, 0, 2, 0, guard ? color : skin);
  head.scale.z = 0.88;
  if (guard) {
    box(0.36, 0.35, 0.09, 0, 2, 0.21, '#17282e');
    box(0.17, 0.035, 0.02, 0, 2.06, 0.263, '#efeadf');
    box(0.035, 0.12, 0.02, -0.065, 2, 0.263, '#efeadf');
    box(0.035, 0.12, 0.02, 0.065, 2, 0.263, '#efeadf');
  } else {
    const hair = capsule(0.25, 0.025, 0, 2.15, -0.035, '#253638');
    hair.scale.set(1, 0.6, 0.9);
    box(0.34, 0.04, 0.035, 0, 2.02, 0.215, '#353d3c');
    box(0.07, 0.095, 0.075, 0, 1.97, 0.238, skin);
  }
  const legs = [],
    knees = [],
    arms = [],
    elbows = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.2, 0.92, 0);
    body.add(hip);
    legs.push(hip);
    capsule(0.125, 0.22, 0, -0.2, 0, color, hip);
    const knee = new THREE.Group();
    knee.position.y = -0.4;
    hip.add(knee);
    knees.push(knee);
    capsule(0.105, 0.2, 0, -0.17, 0, color, knee);
    box(0.18, 0.16, 0.06, 0, -0.015, 0.095, '#36504d', knee);
    box(0.23, 0.16, 0.38, 0, -0.37, 0.055, '#1c2c31', knee);
    box(0.235, 0.045, 0.39, 0, -0.44, 0.055, '#9ca69b', knee);
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.43, 1.63, 0);
    body.add(shoulder);
    arms.push(shoulder);
    capsule(0.115, 0.2, 0, -0.17, 0, color, shoulder);
    const elbow = new THREE.Group();
    elbow.position.y = -0.34;
    shoulder.add(elbow);
    elbows.push(elbow);
    capsule(0.09, 0.19, 0, -0.16, 0, color, elbow);
    capsule(0.085, 0.035, 0, -0.33, 0, skin, elbow);
  }
  const gun = box(0.14, 0.16, 0.38, 0, -0.34, 0.15, '#1b2a31', elbows[1]);
  gun.visible = armed;
  box(0.11, 0.08, 0.22, 0, 0.075, 0.025, '#64736f', gun);
  root.userData = { body, legs, knees, arms, elbows, phase: 0, stride: 0 };
  if (player) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.77, 0.84, 40),
      new THREE.MeshBasicMaterial({
        color: '#a7f9d5',
        transparent: true,
        opacity: 0.8,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    ring.renderOrder = 100;
    root.add(ring);
  }
  return root;
}

export function animateCharacter(mesh, dt, speed, aiming, alive = true) {
  const r = mesh.userData;
  const amount = alive ? Math.min(speed / 8, 1) : 0;
  r.stride += (amount - r.stride) * (1 - Math.exp(-dt * 14));
  r.phase += dt * (speed > 0.2 ? speed * 1.6 : 2);
  const wave = Math.sin(r.phase),
    stride = r.stride;
  r.body.position.y = alive ? Math.abs(wave) * 0.055 * stride : 0;
  r.body.rotation.x = alive ? -0.045 * stride : 0;
  for (let i = 0; i < 2; i++) {
    const swing = wave * (i ? 1 : -1) * stride;
    r.legs[i].rotation.x = swing * 0.65;
    r.knees[i].rotation.x = Math.max(0, -swing) * 0.7;
    r.arms[i].rotation.x = aiming ? -1.25 : -swing * 0.48;
    r.elbows[i].rotation.x = aiming ? -0.25 : -0.18 - Math.max(0, swing) * 0.22;
  }
}
