import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHANT_RECORDINGS } from '../app/arena/chant.js';
import { chantPattern } from '../app/arena/rules.js';

test('each full-sentence recording lasts exactly as long as its green phase', () => {
  CHANT_RECORDINGS.forEach((clip, i) => {
    const wav = readFileSync(new URL(`../public/audio/chant/${clip.file}`, import.meta.url));
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    let bytes = 0, bytesPerSecond = 0;
    for (let p=12; p+8<=wav.length;) {
      const size = wav.readUInt32LE(p+4), tag = wav.toString('ascii',p,p+4);
      if (tag === 'fmt ') bytesPerSecond = wav.readUInt32LE(p+16);
      if (tag === 'data') bytes = size;
      p += 8+size+(size%2);
    }
    assert.ok(bytes > 0 && bytesPerSecond > 0);
    const duration = chantPattern(() => (i+0.1)/4).reduce((a,b)=>a+b,0);
    assert.ok(Math.abs(bytes/bytesPerSecond-duration)<0.001);
  });
});
