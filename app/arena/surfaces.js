import * as T from 'three';

// Authored, deterministic textures; no network assets or per-frame generation.
export function arenaSurface(kind, renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const c = canvas.getContext('2d');
  let seed = 9127;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  c.fillStyle = kind === 'sand' ? '#b9a17b' : '#a0b6ad';
  c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 28000; i++) {
    const light = random() > 0.5;
    c.fillStyle = light ? 'rgba(255,242,207,0.16)' : 'rgba(45,38,28,0.12)';
    const r = kind === 'sand' ? 0.5 + random() * 2 : 0.5 + random();
    c.fillRect(random() * 512, random() * 512, r, r);
  }
  if (kind === 'sand') {
    for (let i = 0; i < 160; i++) {
      const x = random() * 512,
        y = random() * 512;
      c.strokeStyle = 'rgba(68,50,26,0.09)';
      c.lineWidth = 1 + random() * 2;
      c.beginPath();
      c.ellipse(
        x,
        y,
        3 + random() * 13,
        1 + random() * 3,
        random() * Math.PI,
        0,
        Math.PI,
      );
      c.stroke();
    }
  } else {
    for (let i = 0; i < 90; i++) {
      const x = random() * 512,
        y = random() * 512;
      const gradient = c.createLinearGradient(x, y, x, y + 90);
      gradient.addColorStop(0, 'rgba(29,49,43,0.12)');
      gradient.addColorStop(1, 'rgba(29,49,43,0)');
      c.fillStyle = gradient;
      c.fillRect(x, y, 1 + random() * 5, 90);
    }
    c.fillStyle = '#61766c';
    c.fillRect(0, 0, 512, 3);
    c.fillRect(0, 0, 3, 512);
    c.fillStyle = '#c5d1bb';
    c.fillRect(3, 3, 509, 2);
    c.fillRect(3, 3, 2, 509);
  }
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.repeat.set(kind === 'sand' ? 10 : 9, kind === 'sand' ? 16 : 2);
  map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const bump = map.clone();
  bump.colorSpace = T.NoColorSpace;
  return new T.MeshStandardMaterial({
    map,
    bumpMap: bump,
    bumpScale: kind === 'sand' ? 0.09 : 0.025,
    roughness: 0.97,
    color: '#ffffff',
  });
}

export function crowdContactShadows(scene, count) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const c = canvas.getContext('2d'),
    g = c.createRadialGradient(32, 32, 3, 32, 32, 31);
  g.addColorStop(0, 'rgba(24,21,19,0.4)');
  g.addColorStop(0.4, 'rgba(24,21,19,0.24)');
  g.addColorStop(1, 'rgba(24,21,19,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
  const mesh = new T.InstancedMesh(
    new T.PlaneGeometry(1.8, 1.8),
    new T.MeshBasicMaterial({
      map: new T.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
    count,
  );
  mesh.frustumCulled = false;
  scene.add(mesh);
  const transform = new T.Object3D();
  transform.rotation.x = -Math.PI / 2;
  return {
    update(s) {
      mesh.visible = s.round === 0;
      if (!mesh.visible) return;
      for (let i = 0; i < count; i++) {
        const p = i === count - 1 ? s : s.crowd[i];
        transform.position.set(p.x, 0.008, p.z);
        transform.scale.set(1, p.alive === false ? 1.4 : 0.72, 1);
        transform.updateMatrix();
        mesh.setMatrixAt(i, transform.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
