import { surfaceMaterial } from '../game/rendering.js';
import * as T from 'three';
import { createCharacter, animateCharacter } from '../game/character.js';
import { STORAGE, CELLS, PRESSES, ROADBLOCKS } from './adventure.js';
export function createAdventureScene() {
  const scene = new T.Scene();
  scene.background = new T.Color('#07101c');
  scene.fog = new T.Fog('#07101c', 35, 110);
  scene.add(new T.HemisphereLight('#96bbdc', '#101825', 1.15));
  scene.add(new T.AmbientLight('#b8cbe0', 0.8));
  const sun = new T.DirectionalLight('#b5d9ff', 2);
  sun.position.set(-15, 30, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -25,
    right: 25,
    top: 32,
    bottom: -25,
    near: 0.1,
    far: 100,
  });
  sun.shadow.normalBias = 0.04;
  sun.shadow.bias = -0.0002;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const mats = new Map(),
    geoms = new Set();
  function mat(color, metal = false) {
    const key = color + metal;
    if (!mats.has(key))
      mats.set(
        key,
        surfaceMaterial(
          new T.MeshPhysicalMaterial({
            clearcoat: metal ? 0.45 : 0,
            clearcoatRoughness: 0.25,
            color,
            emissive: ['#ffffca', '#ff4e61', '#ffe398', '#77ffc0', '#ff304a'].includes(color) ? color : '#000000',
            emissiveIntensity: 1.8,
            roughness: metal ? 0.35 : 0.8,
            metalness: metal ? 0.5 : 0.02,
          }),
        ),
      );
    return mats.get(key);
  }
  function box(g, w, h, d, x, y, z, color, metal = false) {
    const geo = new T.BoxGeometry(w, h, d);
    geoms.add(geo);
    const m = new T.Mesh(geo, mat(color, metal));
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  }
  const dark = new T.Group(),
    factory = new T.Group(),
    road = new T.Group();
  scene.add(dark, factory, road);
  const player = createCharacter('#2f9c87', false, true, mat, false);
  scene.add(player);
  const ringGeo = new T.RingGeometry(0.65, 0.82, 32);
  geoms.add(ringGeo);
  const marker = new T.Mesh(
    ringGeo,
    new T.MeshBasicMaterial({ color: '#ffde85', side: T.DoubleSide }),
  );
  marker.rotation.x = -Math.PI / 2;
  scene.add(marker);
  box(dark, 36, 0.3, 62, 0, -0.2, -2, '#182635');
  for (const x of [-18, 18]) box(dark, 0.6, 8, 62, x, 4, -2, '#17232d');
  box(dark, 36, 8, 0.6, 0, 4, -33, '#182b35');
  for (const b of STORAGE) {
    box(dark, b.w, 3.3, b.d, b.x, 1.65, b.z, '#293847', true);
    for (let i = 0; i < 3; i++)
      box(
        dark,
        b.w + 0.1,
        0.1,
        b.d + 0.1,
        b.x,
        0.35 + i * 1.2,
        b.z,
        '#566370',
        true,
      );
    for (let i = 0; i < 5; i++)
      box(dark, 1.05, 0.8, 1.5, b.x - b.w / 2 + 1 + i * 1.3, 2, b.z, '#506069');
  }
  for (let i = 0; i < 8; i++) {
    box(dark, 0.2, 0.1, 52, -14 + i * 4, 0.01, -2, '#273744');
    const light = new T.PointLight(i % 2 ? '#e35758' : '#327bba', 8, 11, 2);
    light.position.set(i % 2 ? -14 : 14, 4, 23 - i * 7);
    dark.add(light);
    box(
      dark,
      0.8,
      0.2,
      0.5,
      light.position.x,
      4,
      light.position.z,
      i % 2 ? '#d64c56' : '#427fa5',
    );
  }
  const batteries = CELLS.map((p) => {
    const g = new T.Group();
    g.position.set(p.x, 0.3, p.z);
    dark.add(g);
    box(g, 0.8, 0.75, 0.6, 0, 0.4, 0, '#d3af59', true);
    box(g, 0.6, 0.1, 0.5, 0, 0.85, 0, '#ffe398');
    const l = new T.PointLight('#73ffd0', 6, 5);
    l.position.y = 1;
    g.add(l);
    return g;
  });
  const exit = box(dark, 5, 5, 0.5, 0, 2.5, -31, '#1a6b68', true);
  box(dark, 5, 0.15, 0.6, 0, 5, -31, '#77ffc0');
  const hunters = [0, 1].map(() => {
    const g = createCharacter('#b34c62', true, false, mat, false);
    dark.add(g);
    const l = new T.PointLight('#f33d59', 3, 4);
    l.position.y = 1.6;
    g.add(l);
    return g;
  });
  const torch = new T.SpotLight('#fff1ca', 32, 25, 0.65, 0.55, 1.2);
  scene.add(torch, torch.target);
  box(factory, 15, 0.5, 8, 0, -0.4, 1, '#3b4d59', true);
  const fragile = [];
  for (const [a, b] of [
    [3, 18],
    [21, 42],
    [45, 58],
    [58, 64],
    [64, 69],
    [72, 95],
  ]) {
    const slab = box(
      factory,
      8,
      0.4,
      b - a,
      0,
      -0.25,
      -(a + b) / 2,
      a === 58 ? '#9a6d37' : '#526573',
      true,
    );
    if (a === 58) fragile.push(slab);
  }
  for (let z = 4; z <= 94; z += 2) {
    for (const x of [-5.2, 5.2]) {
      box(factory, 2.2, 0.4, 1.9, x, -0.25, -z, '#526272', true);
      box(factory, 0.12, 1, 1.9, x + Math.sign(x) * 1.1, 0.5, -z, '#d1a45b');
    }
    if (z % 8 === 0) {
      for (const x of [-8, 8]) {
        box(factory, 0.5, 12, 0.5, x, 2, -z, '#283d4f', true);
        box(factory, 1, 1, 1, x, 5, -z, '#c0663d');
      }
      box(factory, 16, 0.4, 0.6, 0, 8, -z, '#354958');
    }
  }
  const pressMeshes = PRESSES.map((z) => {
    const g = new T.Group();
    g.position.z = -z;
    factory.add(g);
    box(g, 7.4, 1.3, 2.2, 0, 0, 0, '#916335', true);
    box(g, 7.4, 0.12, 2.25, 0, -0.7, 0, '#f8bb4e');
    return g;
  });
  const belts = [];
  for (let i = 0; i < 18; i++)
    belts.push(
      box(factory, 7.5, 0.06, 0.14, 0, 0.03, -32 - i * 0.45, '#7199ac', true),
    );
  const sparks = [];
  for (let i = 0; i < 26; i++)
    sparks.push(
      box(
        factory,
        0.07,
        0.2,
        0.07,
        (i % 2 ? 1 : -1) * 7,
        1,
        -i * 3.5,
        '#ffc873',
      ),
    );
  box(factory, 15, 0.6, 6, 0, -0.4, -96, '#49665e');
  box(factory, 10, 0.2, 0.3, 0, 0.04, -92, '#7effb4');
  box(road, 21, 0.5, 720, 0, -0.35, -300, '#243340');
  for (let i = 0; i < 120; i++) {
    const z = 25 - i * 6;
    box(road, 0.14, 0.02, 2.6, -3.4, 0, z, '#b5bbb1');
    box(road, 0.14, 0.02, 2.6, 3.4, 0, z, '#b5bbb1');
    for (const x of [-10, 10])
      box(road, 0.4, 1, 5.7, x, 0.5, z, '#586b76', true);
    if (i % 3 === 0) {
      for (const x of [-15, 15]) {
        const height = 8 + (i % 5) * 3;
        box(road, 7, height, 11, x, height / 2, z, '#162536');
        for (let y = 3; y < height; y += 3)
          box(road, 0.08, 0.5, 6, x - Math.sign(x) * 3.55, y, z, '#4a6a7a');
      }
    }
  }
  ROADBLOCKS.forEach((b, i) => {
    box(road, b.w, 1.6, 3, b.x, 0.8, -b.z, i % 2 ? '#985646' : '#53667a', true);
    box(road, b.w + 0.1, 0.25, 3.1, b.x, 1.5, -b.z, '#f5c36a');
  });
  box(road, 4.4, 2, 40, 0, 1, -305, '#c08d43');
  box(road, 19, 0.08, 3, 0, 0.02, -600, '#72cda6');
  function vehicle(color) {
    const g = new T.Group();
    box(g, 2.3, 0.7, 4.4, 0, 0.75, 0, color, true);
    box(g, 1.95, 0.85, 2.2, 0, 1.4, 0.15, '#253c4b', true);
    box(g, 2, 0.13, 2.3, 0, 1.9, 0.15, color, true);
    for (const x of [-1.12, 1.12])
      for (const z of [-1.35, 1.35]) {
        const geo = new T.CylinderGeometry(0.46, 0.46, 0.32, 14);
        geoms.add(geo);
        const m = new T.Mesh(geo, mat('#101820'));
        m.rotation.z = Math.PI / 2;
        m.position.set(x, 0.5, z);
        g.add(m);
      }
    for (const x of [-0.8, 0.8]) {
      box(g, 0.5, 0.2, 0.1, x, 0.85, -2.25, '#ffffca');
      box(g, 0.5, 0.2, 0.1, x, 0.85, 2.25, '#ff4e61');
    }
    return g;
  }
  const car = vehicle('#e0ad58');
  road.add(car);
  const pursuers = [vehicle('#323c52'), vehicle('#404659')];
  pursuers.forEach((g) => road.add(g));
  const headlights = [-1, 1].map((x) => {
    const l = new T.SpotLight('#e8f4ff', 25, 40, 0.35, 0.5, 1);
    road.add(l, l.target);
    return { l, x };
  });
  let previous = null;
  return {
    render(s, camera, renderer, dt, renderWorld) {
      const c = s.challenge;
      dark.visible = c.kind === 'blackout';
      factory.visible = c.kind === 'factory';
      road.visible = c.kind === 'chase';
      const dead = ['dying', 'lost'].includes(s.status);
      scene.background.set(c.kind === 'blackout' ? '#030914' : '#091727');
      scene.fog.color.copy(scene.background);
      sun.intensity = c.kind === 'blackout' ? 0.3 : 2;
      player.visible = c.kind !== 'chase';
      marker.visible = player.visible;
      torch.visible = c.kind === 'blackout' && c.flash;
      const z = c.kind === 'blackout' ? c.z : -c.z;
      scene.environmentIntensity = c.kind === 'blackout' ? 0.12 : 0.45;
      sun.position.set(c.x - 15, 30, z + 10);
      sun.target.position.set(c.x, 0, z - 8);
      player.position.set(c.x, c.y, z);
      player.rotation.set(
        dead ? Math.min(1.5, s.deathTime * 0.8) : 0,
        c.heading,
        0,
      );
      animateCharacter(player, dt, c.speed, false, !dead);
      marker.position.set(c.x, 0.04, z);
      batteries.forEach((g, i) => {
        g.visible = !c.cells?.includes(i);
        g.rotation.y = s.elapsed;
      });
      if (c.kind === 'blackout') {
        hunters.forEach((g, i) => {
          const h = c.hunters[i];
          g.position.set(h.x, 0, h.z);
          g.rotation.y = Math.atan2(c.x - h.x, c.z - h.z);
          animateCharacter(g, dt, 3, false, true);
        });
        torch.position.set(c.x, 2, c.z);
        torch.target.position.set(
          c.x + Math.sin(c.heading) * 10,
          0.2,
          c.z + Math.cos(c.heading) * 10,
        );
        exit.material = mat(c.cells.length === 3 ? '#48eaaa' : '#1a4a53');
      }
      if (c.kind === 'factory') {
        pressMeshes.forEach((g, i) => {
          const phase = (s.elapsed + i * 0.6) % 3;
          g.position.y =
            phase > 2.05 ? 0.8 : phase > 1.7 ? 5 - (phase - 1.7) * 12 : 5;
          g.children[1].material = mat(phase > 1.7 ? '#ff304a' : '#77e6b5');
        });
        const collapse = c.collapses[0];
        const age = collapse ? s.elapsed - collapse.time : 0;
        fragile.forEach((m, i) => {
          m.position.y = -0.25 - Math.max(0, age - 1.7) ** 2 * 8;
          m.rotation.z = age > 1.7 ? (age - 1.7) * (i ? 0.5 : -0.5) : 0;
          m.material = mat(age > 0 ? '#d75739' : '#9a6d37', true);
        });
        belts.forEach(
          (m, i) =>
            (m.position.z =
              -32 - ((((i * 0.45 - s.elapsed * 1.2) % 8) + 8) % 8)),
        );
        sparks.forEach((m, i) => {
          m.position.y = (s.elapsed * 3 + i * 0.31) % 7;
          m.visible = i % 3 !== Math.floor(s.elapsed) % 3;
        });
      }
      if (c.kind === 'chase') {
        car.position.set(c.x, 0, -c.z);
        car.rotation.y = -c.heading;
        car.rotation.z = -c.heading * 0.12;
        pursuers.forEach((g, i) => {
          g.position.set(
            (i ? 1 : -1) * 4 + Math.sin(s.elapsed + i) * 1.5,
            0,
            -c.z + c.pursuit + 5 + i * 5,
          );
        });
        headlights.forEach(({ l, x }) => {
          l.position.set(c.x + x, 1, -c.z - 2);
          l.target.position.set(c.x + x, 0, -c.z - 28);
        });
      }
      const target = new T.Vector3(
        c.x + (c.kind === 'blackout' ? 5 : 0),
        c.kind === 'blackout' ? 12 : c.kind === 'factory' ? 9 : 6.5,
        z + (c.kind === 'blackout' ? 12 : c.kind === 'factory' ? 12 : 14),
      );
      if (previous !== s) {
        camera.position.copy(target);
        previous = s;
      } else camera.position.lerp(target, 1 - Math.exp(-dt * 7));
      camera.lookAt(c.x, 1, z - (c.kind === 'chase' ? 14 : 5));
      renderWorld(scene, camera);
    },
    dispose() {
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material)
          for (const m of [].concat(o.material)) {
            m.map?.dispose();
            m.dispose();
          }
      });
      geoms.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}
