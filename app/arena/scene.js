import * as T from 'three';
import { createCharacter, animateCharacter } from '../game/character.js';
import { younghee, instancedCrowd, label, cameraPose } from './visuals.js';
export function createArena(host, state, update, options = () => ({})) {
  const renderer = new T.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', '3D 생존 경기장');
  const scene = new T.Scene();
  scene.background = new T.Color('#719aa6');
  scene.fog = new T.Fog('#719aa6', 110, 245);
  const camera = new T.PerspectiveCamera(53, 1, 0.1, 350),
    materials = new Map();
  const mat = (c) => {
    if (!materials.has(c))
      materials.set(
        c,
        new T.MeshStandardMaterial({ color: c, roughness: 0.8 }),
      );
    return materials.get(c);
  };
  scene.add(new T.HemisphereLight('#e7f8ff', '#827158', 2.7));
  const sun = new T.DirectionalLight('#fff0ce', 3);
  sun.position.set(-35, 70, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -40,
    right: 40,
    top: 65,
    bottom: -55,
    far: 180,
  });
  sun.shadow.bias = -0.001;
  scene.add(sun);
  const common = new T.Group(),
    field = new T.Group(),
    tug = new T.Group(),
    glass = new T.Group(),
    final = new T.Group(),
    stoneGroup = new T.Group();
  scene.add(common, field, tug, glass, final, stoneGroup);
  function box(w, h, d, x, y, z, c, parent = common) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  box(66, 1, 110, 0, -0.6, 3, '#cbb491');
  // The camera side is deliberately open. No opaque near wall can hide play.
  box(66, 12, 1, 0, 5.5, -51, '#bed7d1');
  box(1, 9, 110, -33, 4, 3, '#a1bcb6');
  box(1, 9, 110, 33, 4, 3, '#a1bcb6');
  for (let z = -45; z < 54; z += 10) {
    box(0.2, 9, 0.3, -32.4, 4, z, '#d4e1cc');
    box(0.2, 9, 0.3, 32.4, 4, z, '#d4e1cc');
  }
  box(61, 0.025, 0.22, 0, 0.02, -33, '#c84e65', field);
  box(61, 0.025, 0.22, 0, 0.02, 45.5, '#fff5dd', field);
  const finishLabel = label('FINISH', 3, '#943b42');
  finishLabel.position.set(0, 0.4, -35);
  field.add(finishLabel);
  const doll = younghee(mat);
  doll.position.set(0, 0, -44);
  field.add(doll);
  const trunk = new T.Mesh(
    new T.CylinderGeometry(0.7, 1.3, 14, 9),
    mat('#665343'),
  );
  trunk.position.set(0, 6, -47);
  field.add(trunk);
  for (const sign of [-1, 1]) {
    const branch = new T.Mesh(
      new T.CylinderGeometry(0.2, 0.6, 10, 7),
      mat('#665343'),
    );
    branch.position.set(sign * 3, 11, -47);
    branch.rotation.z = sign * 0.8;
    field.add(branch);
  }
  const crowd = instancedCrowd(scene, mat),
    player = createCharacter('#278673', false, true, mat, false);
  scene.add(player);
  const marker = label('▼ 456', 1.5, '#fff384');
  marker.renderOrder = 1000;
  scene.add(marker);
  const playerHalo = new T.Mesh(
    new T.RingGeometry(0.86, 1.05, 48),
    new T.MeshBasicMaterial({
      color: '#ffef80',
      side: T.DoubleSide,
      depthTest: false,
      transparent: true,
      opacity: 0.95,
    }),
  );
  playerHalo.rotation.x = -Math.PI / 2;
  playerHalo.renderOrder = 999;
  scene.add(playerHalo);
  const dollCamera = new T.PerspectiveCamera(38, 1, 0.1, 100);
  dollCamera.position.set(0, 8, -28);
  dollCamera.lookAt(0, 6.6, -44);
  const guards = [];
  for (const side of [-1, 1])
    for (let z = -38; z <= 42; z += 20) {
      const g = createCharacter('#d54471', true, false, mat);
      g.position.set(side * 30, 0, z);
      g.rotation.y = (-side * Math.PI) / 2;
      field.add(g);
      guards.push(g);
    }
  const defender = createCharacter('#2b645a', false, false, mat, false);
  final.add(defender);
  const caution = label('!', 1, '#ffab4a');
  caution.position.y = 3;
  defender.add(caution);
  function line(points, color, parent) {
    if (parent === final) {
      const group = new T.Group();
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
          b = points[i],
          length = Math.hypot(b[0] - a[0], b[2] - a[2]);
        for (const [width, y, c] of [
          [0.34, 0.035, '#51493a'],
          [0.21, 0.055, color],
        ]) {
          const strip = new T.Mesh(
            new T.BoxGeometry(width, 0.022, length),
            new T.MeshBasicMaterial({ color: c }),
          );
          strip.position.set((a[0] + b[0]) / 2, y, (a[2] + b[2]) / 2);
          strip.rotation.y = Math.atan2(b[0] - a[0], b[2] - a[2]);
          group.add(strip);
        }
      }
      parent.add(group);
      return group;
    }
    const l = new T.Line(
      new T.BufferGeometry().setFromPoints(
        points.map((p) => new T.Vector3(...p)),
      ),
      new T.LineBasicMaterial({ color }),
    );
    parent.add(l);
    return l;
  }
  line(
    [
      [-10, 0.04, 24],
      [-10, 0.04, 0],
      [0, 0.04, -20],
      [10, 0.04, 0],
      [10, 0.04, 24],
      [3, 0.04, 24],
    ],
    '#fff3cf',
    final,
  );
  line(
    [
      [-10, 0.04, 24],
      [-3, 0.04, 24],
    ],
    '#fff3cf',
    final,
  );
  for (const z of [-2, 2])
    line(
      [
        [-12, 0.05, z],
        [12, 0.05, z],
      ],
      '#ebbf7c',
      final,
    );
  const goal = new T.Mesh(
    new T.RingGeometry(2.55, 3.02, 64),
    new T.MeshBasicMaterial({ color: '#fff1b4', side: T.DoubleSide }),
  );
  goal.rotation.x = -Math.PI / 2;
  goal.position.set(0, 0.05, -21);
  final.add(goal);
  const gate = label('입구 ↑', 1.4);
  gate.position.set(0, 0.2, 26);
  final.add(gate);
  const neck = label('목 →', 1.5, '#ffdb87');
  neck.position.set(-11, 0.4, -4);
  final.add(neck);
  // Elevated tug platforms and ten animated contestants on each side.
  box(17, 1, 6, -11, -0.6, 0, '#5f7883', tug);
  box(17, 1, 6, 11, -0.6, 0, '#5f7883', tug);
  for (const x of [-18, -5, 5, 18])
    box(0.3, 12, 0.3, x, -6, -2.4, '#53727c', tug);
  const rope = new T.Mesh(
    new T.CylinderGeometry(0.07, 0.07, 37, 10),
    mat('#c5a574'),
  );
  rope.rotation.z = Math.PI / 2;
  rope.position.y = 1.2;
  tug.add(rope);
  const sweat = new T.InstancedMesh(
    new T.SphereGeometry(0.065, 5, 4),
    mat('#b4e4ef'),
    20,
  );
  sweat.frustumCulled = false;
  tug.add(sweat);
  const sweatTransform = new T.Object3D();
  const ribbon = box(0.16, 0.5, 0.13, 0, 1.1, 0, '#ed4f73', tug),
    teams = [];
  for (const side of [-1, 1])
    for (let i = 0; i < 10; i++) {
      const c = createCharacter(
        side < 0 ? '#32927a' : '#426b79',
        false,
        false,
        mat,
        false,
      );
      tug.add(c);
      c.userData.head.material = c.userData.head.material.clone();
      teams.push({ c, side, i });
    }
  const bubbles = ['영~차! 영~차!', '하나! 둘!!', '버텨!!'].map((text) => {
    const b = label(text, 2.3, '#293d3c', true);
    tug.add(b);
    return b;
  });
  // A continuous open bridge: no surrounding walls and one stable overview camera.
  const panes = [],
    marks = [];
  for (let i = 0; i < 18; i++)
    for (let side = 0; side < 2; side++) {
      const p = box(
        3.4,
        0.18,
        3.2,
        side === 0 ? -2 : 2,
        0,
        34 - i * 4,
        '#73c7d7',
        glass,
      );
      p.material = new T.MeshStandardMaterial({
        color: '#73c7d7',
        metalness: 0.45,
        roughness: 0.17,
        transparent: true,
        opacity: 0.65,
      });
      panes.push(p);
      const m = label('✓', 0.9, '#bfff9c');
      m.position.set(p.position.x, 0.5, p.position.z);
      glass.add(m);
      marks.push(m);
    }
  for (const x of [-4, 0, 4]) box(0.13, 1, 77, x, -0.6, 0, '#6c788c', glass);
  box(10, 1, 5, 0, -0.6, 39, '#384457', glass);
  box(10, 1, 5, 0, -0.6, -39, '#384457', glass);
  const stepLabel = label('START', 1.7);
  stepLabel.position.set(0, 0.2, 40);
  glass.add(stepLabel);
  const targetStone = new T.Group();
  targetStone.position.set(0, 0, -8);
  stoneGroup.add(targetStone);
  box(0.75, 1.4, 0.65, 0, 0.7, 0, '#67777d', targetStone);
  box(0.76, 0.2, 0.66, 0, 1.04, 0, '#d3cdb6', targetStone);
  const thrownStone = box(0.36, 0.28, 0.46, 0, 1.2, 8, '#7b8b8c', stoneGroup);
  box(9, 0.04, 0.18, 0, 0.02, 7.2, '#faf0d0', stoneGroup);
  const targetCaption = label('비석', 1, '#fff2c5');
  targetCaption.position.set(0, 2.2, -8);
  stoneGroup.add(targetCaption);
  const blood = new T.Group();
  scene.add(blood);
  const bloodMat = new T.MeshBasicMaterial({
      color: '#8c1829',
      side: T.DoubleSide,
      transparent: true,
      opacity: 0.8,
    }),
    pool = new T.Mesh(new T.CircleGeometry(1, 32), bloodMat);
  pool.rotation.x = -Math.PI / 2;
  blood.add(pool);
  const droplets = Array.from({ length: 18 }, () => {
    const p = new T.Mesh(new T.SphereGeometry(0.055, 5, 4), mat('#941b27'));
    blood.add(p);
    return p;
  });
  const shotLine = line(
    [
      [0, 0, 0],
      [0, 0, 0],
    ],
    '#ffe3a5',
    scene,
  );
  shotLine.visible = false;
  const flash = new T.PointLight('#ffbb65', 0, 15);
  scene.add(flash);
  let seenShot = 0,
    shotTime = 0;
  const chips = [];
  for (let i = 0; i < 16; i++) {
    const chip = new T.Mesh(
      new T.TetrahedronGeometry(0.18 + (i % 3) * 0.08),
      new T.MeshStandardMaterial({
        color: '#a6e6f7',
        metalness: 0.6,
        roughness: 0.1,
      }),
    );
    scene.add(chip);
    chips.push(chip);
  }
  let raf,
    last = performance.now(),
    visualTime = 0,
    previousRun = null;
  const resize = () => {
    renderer.setSize(host.clientWidth, host.clientHeight);
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    update(dt);
    const s = state(),
      opt = options();
    if (!opt.paused) visualTime += dt;
    const dying = s.status === 'dying' || s.status === 'lost';
    field.visible = s.round === 0;
    tug.visible = s.round === 2;
    glass.visible = s.round === 4;
    final.visible = s.round === 5;
    stoneGroup.visible = s.round === 3;
    common.visible = s.round !== 2 && s.round !== 4;
    const dark = s.round === 2 || s.round === 4;
    scene.background.set(dark ? '#101725' : '#719aa6');
    scene.fog.color.copy(scene.background);
    crowd.update(s, visualTime);
    player.visible =
      s.round === 0 || s.round === 3 || s.round === 4 || s.round === 5;
    player.position.set(s.round === 3 ? 0 : s.x, 0, s.round === 3 ? 8.8 : s.z);
    player.rotation.set(0, s.round === 3 ? Math.PI : s.heading, 0);
    const hopping =
      s.round === 5 &&
      s.squidStage === 'neck' &&
      s.speed > 0 &&
      s.status === 'playing';
    if (hopping) player.position.y = Math.abs(Math.sin(visualTime * 8)) * 0.32;
    animateCharacter(
      player,
      opt.paused ? 0 : dt,
      s.status === 'playing' ? s.speed : 0,
      false,
    );
    if (hopping) player.userData.legs[1].rotation.x = -0.9;
    if (s.round === 3) {
      const p = s.stone;
      thrownStone.position.set(p.x, p.y, p.z);
      thrownStone.rotation.x = s.stone.active ? (s.elapsed - s.throwAt) * 9 : 0;
      targetStone.rotation.x = s.stoneHit
        ? -Math.min(Math.PI / 2, s.stoneHitTime * 3)
        : 0;
      player.userData.arms[1].rotation.x =
        -Math.max(0, 1 - (s.elapsed - s.throwAt) * 1.5) * 2.2;
      if (s.retrieveTime > 0) {
        const t = 1 - s.retrieveTime / s.retrieveDuration,
          travel = t < 0.5 ? t * 2 : (1 - t) * 2;
        player.position.set(p.x * travel, 0, 8.8 + (p.z - 8.8) * travel);
        player.rotation.y =
          t < 0.5 ? Math.atan2(p.x, p.z - 8.8) : Math.atan2(-p.x, 8.8 - p.z);
        animateCharacter(player, opt.paused ? 0 : dt, 4, false);
        thrownStone.visible = t < 0.5;
      } else thrownStone.visible = !s.stoneHit;
    }
    if (s.jump) {
      const t = Math.min(1, s.jump.t / 0.52);
      player.position.set(
        T.MathUtils.lerp(s.jump.fromX, s.jump.x, t),
        Math.sin(t * Math.PI) * 1.4,
        T.MathUtils.lerp(s.jump.fromZ, s.jump.z, t),
      );
      player.rotation.y = Math.atan2(
        s.jump.x - s.jump.fromX,
        s.jump.z - s.jump.fromZ,
      );
    }
    if (dying) {
      if (s.deathKind === 'fall')
        player.position.y = -Math.min(20, s.deathTime * s.deathTime * 6);
      else if (s.round === 0) {
        const t = s.deathTime;
        player.userData.body.rotation.x = Math.min(0.9, t * 0.5);
        player.userData.knees.forEach((k) => (k.rotation.x = Math.min(1.3, t)));
        player.position.y = -Math.min(0.65, t * 0.45);
        player.rotation.z = Math.max(0, Math.min(Math.PI / 2, (t - 1.1) * 0.7));
      } else {
        player.rotation.z = Math.min(Math.PI / 2, s.deathTime * 2.2);
        player.position.y = -Math.min(0.35, s.deathTime * 0.2);
      }
    }
    marker.visible = player.visible && !dying && s.round !== 3;
    marker.position.copy(player.position).add(new T.Vector3(0, 3, 0));
    playerHalo.visible = marker.visible;
    playerHalo.position.set(player.position.x, 0.055, player.position.z);
    blood.visible = s.round === 0 && dying;
    if (blood.visible) {
      const t = s.deathTime;
      pool.position.set(s.x + 0.35, 0.045, s.z);
      pool.scale.set(Math.min(1.45, t * 0.36), Math.min(0.9, t * 0.25), 1);
      droplets.forEach((p, i) => {
        const a = i * 2.4;
        p.visible = t < 1.2;
        p.position.set(
          s.x + Math.cos(a) * t * (0.4 + i * 0.04),
          Math.max(0.06, 1.3 + t * (i % 3) * 0.2 - t * t * 2.3),
          s.z + Math.sin(a) * t * 0.8,
        );
      });
    }
    const headTarget = s.light === 'green' ? Math.PI : 0;
    doll.userData.head.rotation.y = T.MathUtils.lerp(
      doll.userData.head.rotation.y,
      headTarget,
      opt.paused ? 0 : Math.min(1, dt * 5),
    );
    defender.position.set(s.opponentX, 0, s.opponentZ);
    defender.lookAt(s.x, 0, s.z);
    animateCharacter(
      defender,
      opt.paused ? 0 : dt,
      s.status === 'playing' && !s.opponentStun ? 3 : 0,
      s.defenderWindup > 0,
    );
    caution.visible = s.defenderWindup > 0;
    const displacement = (s.force - 0.5) * 8;
    ribbon.position.x = -displacement;
    for (const { c, side, i } of teams) {
      const losing =
          (s.status === 'won' && side === 1) ||
          (dying && s.deathKind === 'tug' && side === -1),
        fallTime = s.status === 'won' ? s.resultTime : s.deathTime;
      c.position.set(
        side * (4.2 + i * 1.35) - displacement,
        losing
          ? -fallTime * fallTime * 3
          : Math.sin(visualTime * 9 + i * 0.4) * 0.035,
        i % 2 ? -0.25 : 0.25,
      );
      c.rotation.y = (-side * Math.PI) / 2;
      animateCharacter(c, opt.paused ? 0 : dt, 1.2, true);
      c.userData.body.rotation.x = -0.22 - Math.sin(visualTime * 7) * 0.035;
      c.userData.legs[0].rotation.x = 0.35;
      c.userData.legs[1].rotation.x = -0.3;
      const strain = side < 0 ? 1 - s.force : s.force;
      c.userData.head.material.color
        .set('#d7ae8a')
        .lerp(new T.Color('#df4d4f'), Math.max(0, (strain - 0.55) * 2));
      if (losing) c.rotation.z = side * 0.7;
      else c.rotation.z = 0;
    }
    teams.forEach(({ c }, i) => {
      const t = (visualTime * 2 + i * 0.23) % 1;
      sweatTransform.position
        .copy(c.position)
        .add(new T.Vector3(0.3, 2.2 - t * 0.65, 0.18));
      sweatTransform.scale.set(1, 1.8, 1);
      sweatTransform.updateMatrix();
      sweat.setMatrixAt(i, sweatTransform.matrix);
    });
    sweat.instanceMatrix.needsUpdate = true;
    bubbles.forEach((b, i) => {
      const beat = Math.floor(s.elapsed / 3.5),
        active =
          s.status === 'playing' && s.elapsed % 3.5 < 1.6 && i === beat % 3;
      b.visible = active;
      b.position.set(teams[i === 1 ? 10 : 0].c.position.x, 3.1, 0);
    });
    const reveal =
      s.round === 4 &&
      s.memory &&
      s.status === 'playing' &&
      s.elapsed < s.revealTime;
    panes.forEach((p, i) => {
      const row = Math.floor(i / 2),
        safe = s.bridge[row] === i % 2,
        broken = s.broken === row && s.x === (i % 2 === 0 ? -2 : 2);
      p.visible = !broken;
      p.material.color.set(reveal ? (safe ? '#a4f599' : '#b84e70') : '#73c7d7');
      p.material.opacity = reveal ? 0.88 : 0.65;
      marks[i].visible = reveal || row < s.progress;
      marks[i].material.color.set(safe ? '#bfff9c' : '#ffb3c8');
      marks[i].visible = marks[i].visible && safe;
    });
    chips.forEach((p, i) => {
      p.visible = s.round === 4 && dying && s.deathKind === 'fall';
      if (p.visible) {
        p.position.set(
          s.x + Math.sin(i * 2.4) * s.deathTime * 2,
          -s.deathTime * s.deathTime * 4,
          s.z + Math.cos(i * 2.4) * s.deathTime * 2,
        );
        p.rotation.set(s.deathTime * i, 0.4 * i, s.deathTime * 2);
      }
    });
    if (s.shotId !== seenShot) {
      seenShot = s.shotId;
      shotTime = 0.23;
      const target = s.shotTarget || { x: s.x, z: s.z };
      const from = new T.Vector3(
        target.x < 0 ? -30 : 30,
        1.55,
        Math.round(target.z / 20) * 20,
      );
      shotLine.geometry.setFromPoints([
        from,
        new T.Vector3(target.x, 1.2, target.z),
      ]);
      flash.position.copy(from);
    }
    if (!opt.paused) shotTime = Math.max(0, shotTime - dt);
    shotLine.visible = shotTime > 0;
    flash.intensity = shotTime > 0 ? 8 : 0;
    const pose = cameraPose(s, camera.aspect, opt.overview);
    if (previousRun !== s) {
      camera.position.set(...pose.position);
      previousRun = s;
      seenShot = s.shotId;
      shotTime = 0;
    } else
      camera.position.lerp(
        new T.Vector3(...pose.position),
        1 - Math.exp(-dt * 5),
      );
    camera.lookAt(...pose.look);
    renderer.render(scene, camera);
    if (s.round === 0 && s.status === 'playing') {
      const w = Math.min(180, host.clientWidth * 0.28),
        h = w * 1.1,
        top = window.innerWidth < 750 ? 145 : 100;
      dollCamera.aspect = w / h;
      dollCamera.updateProjectionMatrix();
      renderer.setScissorTest(true);
      renderer.setScissor(
        host.clientWidth - w - 16,
        host.clientHeight - top - h,
        w,
        h,
      );
      renderer.setViewport(
        host.clientWidth - w - 16,
        host.clientHeight - top - h,
        w,
        h,
      );
      renderer.clearDepth();
      renderer.shadowMap.autoUpdate = false;
      renderer.render(scene, dollCamera);
      renderer.shadowMap.autoUpdate = true;
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, host.clientWidth, host.clientHeight);
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    observer.disconnect();
    const geometries = new Set(),
      mats = new Set(),
      textures = new Set();
    scene.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      for (const m of o.material ? [].concat(o.material) : []) {
        mats.add(m);
        if (m.map) textures.add(m.map);
      }
    });
    geometries.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  };
}
