import * as T from 'three';
// Purpose-built real-time game meshes; all geometry is local and reusable.
export function younghee(material) {
  const root = new T.Group(),
    head = new T.Group();
  head.position.y = 4.65;
  root.add(head);
  const mesh = (g, c, x, y, z, parent = root) => {
    const m = new T.Mesh(g, material(c));
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const sphere = (r, c, x, y, z, p = root, s = [1, 1, 1]) => {
    const m = mesh(new T.SphereGeometry(r, 20, 16), c, x, y, z, p);
    m.scale.set(...s);
    return m;
  };
  mesh(new T.CylinderGeometry(0.69, 0.86, 1.15, 24), '#ebc443', 0, 3.4, 0);
  mesh(new T.CylinderGeometry(0.68, 1.38, 1.85, 32), '#d96b20', 0, 2.35, 0);
  mesh(new T.CylinderGeometry(0.23, 0.23, 0.4, 16), '#efd0a4', 0, 4.13, 0);
  sphere(1.05, '#edcaa1', 0, 0, 0, head, [1, 1.08, 0.86]);
  const hair = sphere(1.09, '#271c19', 0, 0.35, -0.14, head, [1, 0.83, 0.85]);
  for (const side of [-1, 1]) {
    sphere(0.26, '#e5ba90', side * 1, 0, 0, head, [0.55, 1, 0.7]);
    sphere(0.47, '#2e211d', side * 0.99, -0.49, -0.25, head, [0.7, 1.35, 0.72]);
    sphere(0.13, '#795380', side * 0.99, -0.42, -0.02, head);
    sphere(0.26, '#fff9e8', side * 0.39, 0.04, 0.78, head, [1, 0.73, 0.32]);
    sphere(0.11, '#493b2c', side * 0.39, 0.04, 0.865, head, [1, 1, 0.4]);
    sphere(0.055, '#12100e', side * 0.39, 0.04, 0.902, head, [1, 1, 0.4]);
    sphere(0.021, '#ffffff', side * 0.36, 0.075, 0.927, head);
    const brow = mesh(
      new T.CapsuleGeometry(0.035, 0.38, 3, 8),
      '#473026',
      side * 0.38,
      0.3,
      0.83,
      head,
    );
    brow.rotation.z = Math.PI / 2 + side * 0.1;
    sphere(0.37, '#ebc443', side * 0.93, 3.56, 0, root, [0.9, 1.1, 1]);
    const arm = mesh(
      new T.CapsuleGeometry(0.18, 1.32, 4, 12),
      '#ebc59d',
      side * 1.06,
      2.65,
      0.02,
    );
    arm.rotation.z = side * 0.12;
    sphere(0.2, '#e9c299', side * 1.18, 1.86, 0.08);
    mesh(
      new T.CylinderGeometry(0.22, 0.25, 1.24, 16),
      '#edcba9',
      side * 0.44,
      0.87,
      0,
    );
    mesh(
      new T.CylinderGeometry(0.235, 0.24, 0.48, 16),
      '#eee8d1',
      side * 0.44,
      0.34,
      0,
    );
    sphere(0.3, '#302824', side * 0.44, 0.13, 0.16, root, [1, 0.55, 1.7]);
  }
  // Scalloped fringe and hair clip distinguish the doll from a guard avatar.
  for (let i = 0; i < 7; i++)
    sphere(0.24, '#2e211e', (i - 3) * 0.24, 0.62, 0.69, head, [1, 1.2, 0.65]);
  mesh(new T.BoxGeometry(0.31, 0.08, 0.06), '#ac97bc', -0.65, 0.55, 0.88, head);
  sphere(0.13, '#e1b088', 0, -0.19, 0.87, head, [0.7, 1, 0.75]);
  sphere(0.23, '#a86551', 0, -0.49, 0.78, head, [1, 0.32, 0.4]);
  root.userData = { head, hair };
  root.scale.setScalar(1.6);
  return root;
}
export function instancedCrowd(scene, material) {
  const count = 455,
    parts = [
      [
        new T.CapsuleGeometry(0.29, 0.43, 3, 7),
        '#288779',
        [0, 1.23, 0],
        [1, 1, 0.72],
      ],
      [
        new T.SphereGeometry(0.23, 8, 6),
        '#d6b590',
        [0, 1.93, 0],
        [1, 1.15, 0.9],
      ],
      [
        new T.SphereGeometry(0.24, 8, 5),
        '#292723',
        [0, 2.09, -0.03],
        [1, 0.65, 0.95],
      ],
      [
        new T.BoxGeometry(0.19, 0.77, 0.22),
        '#206955',
        [-0.19, 0.48, 0],
        [1, 1, 1],
      ],
      [
        new T.BoxGeometry(0.19, 0.77, 0.22),
        '#206955',
        [0.19, 0.48, 0],
        [1, 1, 1],
      ],
      [
        new T.BoxGeometry(0.16, 0.65, 0.18),
        '#328c78',
        [-0.4, 1.19, 0],
        [1, 1, 1],
      ],
      [
        new T.BoxGeometry(0.16, 0.65, 0.18),
        '#328c78',
        [0.4, 1.19, 0],
        [1, 1, 1],
      ],
      [
        new T.BoxGeometry(0.25, 0.13, 0.025),
        '#ecedcf',
        [0, 1.45, 0.24],
        [1, 1, 1],
      ],
    ];
  const batches = parts.map(([g, c]) => {
    const m = new T.InstancedMesh(g, material(c), count);
    m.instanceMatrix.setUsage(T.DynamicDrawUsage);
    m.frustumCulled = false;
    scene.add(m);
    return m;
  });
  const root = new T.Object3D(),
    part = new T.Object3D(),
    matrix = new T.Matrix4();
  return {
    update(s, time) {
      for (const m of batches) m.visible = s.round === 0;
      if (s.round !== 0) return;
      for (let i = 0; i < count; i++) {
        const n = s.crowd[i],
          moving =
            s.status === 'playing' &&
            s.light === 'green' &&
            n.alive &&
            !n.finished &&
            !n.stagger;
        root.position.set(n.x, n.alive ? 0 : -0.15, n.z);
        root.rotation.set((n.fall * Math.PI) / 2, Math.PI, 0);
        root.updateMatrix();
        parts.forEach((p, j) => {
          part.position.set(...p[2]);
          part.scale.set(...p[3]);
          part.rotation.set(0, 0, 0);
          if (j >= 3 && j <= 6)
            part.rotation.x = moving
              ? Math.sin(time * 9 + n.phase) * (j % 2 ? 1 : -1) * 0.55
              : 0;
          if (j >= 5 && j <= 6 && n.panic > 0)
            part.rotation.z = (j === 5 ? -1 : 1) * 2.3;
          part.updateMatrix();
          matrix.multiplyMatrices(root.matrix, part.matrix);
          batches[j].setMatrixAt(i, matrix);
        });
      }
      for (const m of batches) m.instanceMatrix.needsUpdate = true;
    },
  };
}
export function label(text, size = 1.5, color = '#f6ebc8') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const c = canvas.getContext('2d');
  c.font = 'bold 64px Arial';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = color;
  c.fillText(text, 128, 64);
  const texture = new T.CanvasTexture(canvas),
    sprite = new T.Sprite(
      new T.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
      }),
    );
  sprite.scale.set(size * 2, size, 1);
  return sprite;
}
export function cameraPose(s, aspect, overview = false) {
  if (s.round === 0 && (overview || s.status === 'ready'))
    return {
      position: [0, aspect < 1 ? 115 : 77, aspect < 1 ? 106 : 89],
      look: [0, 0, 5],
    };
  if (s.round === 0)
    return {
      position: [s.x * 0.6, 20, s.z + 23],
      look: [s.x * 0.65, 1, s.z - 13],
    };
  if (s.round === 4)
    return {
      position: [0, aspect < 1 ? 72 : 57, aspect < 1 ? 74 : 61],
      look: [0, 0, 2],
    };
  if (s.round === 2)
    return {
      position: [0, aspect < 1 ? 25 : 15, aspect < 1 ? 46 : 32],
      look: [0, 2, 0],
    };
  if (s.round === 3) return { position: [4, 4.7, 9], look: [0, 1.5, 0] };
  if (s.round === 5)
    return {
      position: [0, aspect < 1 ? 49 : 37, aspect < 1 ? 53 : 43],
      look: [0, 0, 2],
    };
  return { position: [0, 23, 30], look: [0, 0, 0] };
}
