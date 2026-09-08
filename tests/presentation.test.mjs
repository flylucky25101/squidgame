import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  obstructionFraction,
  clearCameraPosition,
} from '../app/game/presentation.js';
import { createCharacter, animateCharacter } from '../app/game/character.js';
import { BUILDINGS, blocked } from '../app/game/model.js';
test('camera preserves clear views and retracts before intersecting a building', () => {
  const b = [{ x: 0, z: 10, w: 8, d: 8, h: 20 }],
    target = { x: 0, y: 1.8, z: 0 };
  const clear = { x: 0, y: 24, z: -25 };
  assert.deepEqual(clearCameraPosition(target, clear, b), clear);
  const desired = { x: 0, y: 24, z: 25 };
  assert(obstructionFraction(target, desired, b) < 1);
  const safe = clearCameraPosition(target, desired, b);
  assert.equal(obstructionFraction(target, safe, b), 1);
  assert(safe.z < 5.4);
});
test('camera paths stay clear throughout city streets and rotation angles', () => {
  for (let x = -120; x <= 120; x += 12)
    for (let z = -120; z <= 120; z += 12) {
      if (blocked(x, z)) continue;
      const target = { x, y: 1.8, z };
      for (let i = 0; i < 8; i++) {
        const desired = {
          x: x + Math.sin((i * Math.PI) / 4) * 25,
          y: 24,
          z: z + Math.cos((i * Math.PI) / 4) * 25,
        };
        const safe = clearCameraPosition(target, desired, BUILDINGS);
        assert.equal(obstructionFraction(target, safe, BUILDINGS), 1);
        assert(Math.hypot(safe.x - x, safe.y - 1.8, safe.z - z) > 0.1);
      }
    }
});
test('character joints animate around pivots, stop at rest, and raise weapon when aiming', () => {
  const mats = new Map();
  const mesh = createCharacter('#84cfb1', false, true, (c) => {
    if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: c }));
    return mats.get(c);
  });
  const rig = mesh.userData;
  animateCharacter(mesh, 0.05, 8, false);
  assert(rig.stride > 0);
  assert.notEqual(rig.legs[0].rotation.x, 0);
  for (let i = 0; i < 100; i++) animateCharacter(mesh, 0.05, 0, false);
  assert(Math.abs(rig.legs[0].rotation.x) < 1e-6);
  animateCharacter(mesh, 0.05, 0, true);
  assert.equal(rig.arms[1].rotation.x, -1.25);
  assert.equal(rig.knees.length, 2);
  assert.equal(rig.elbows.length, 2);
  mesh.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
  });
  mats.forEach((m) => m.dispose());
});
