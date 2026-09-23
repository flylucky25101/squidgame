import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { instancedCrowd } from '../app/arena/visuals.js';
import { newRun, beginRound } from '../app/arena/rules.js';

test('crowd limbs rotate around joints and opposing arms counterbalance legs', () => {
  const scene = new T.Scene();
  const crowd = instancedCrowd(scene, (color) => new T.MeshStandardMaterial({color}));
  const s = newRun(0, false, () => 0.5);
  beginRound(s);
  s.chantTime = 1;
  const matrix = new T.Matrix4();
  const limb = new T.Matrix4();
  const relative = (index) => {
    scene.children[0].getMatrixAt(0, matrix);
    scene.children[index].getMatrixAt(0, limb);
    return matrix.clone().invert().multiply(limb);
  };
  crowd.update(s, 0.2);
  const first = relative(3);
  crowd.update(s, 0.45);
  const second = relative(3);
  assert.ok(new T.Vector3().setFromMatrixPosition(first).distanceTo(new T.Vector3().setFromMatrixPosition(second)) < 1e-5);
  assert.notEqual(first.elements[6], second.elements[6]);
  assert.ok(relative(3).elements[6] * relative(5).elements[6] < 0);
  s.light = 'red';
  crowd.update(s, 1);
  const stopped = scene.children.map((m) => Array.from(m.instanceMatrix.array));
  crowd.update(s, 2);
  assert.deepEqual(scene.children.map((m) => Array.from(m.instanceMatrix.array)), stopped);
  scene.children.forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
});
