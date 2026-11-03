import test from 'node:test';
import assert from 'node:assert/strict';
import { fixAnimatedAssetUrl } from '../src/cdn.js';

test('assets animados trocam a extensão para gif', () => {
  assert.equal(
    fixAnimatedAssetUrl('https://cdn.fluxer.app/icons/100/a_x9f2.png'),
    'https://cdn.fluxer.app/icons/100/a_x9f2.gif',
  );
  assert.equal(
    fixAnimatedAssetUrl('https://cdn.fluxer.app/icons/100/a_x9f2.webp'),
    'https://cdn.fluxer.app/icons/100/a_x9f2.gif',
  );
  assert.equal(
    fixAnimatedAssetUrl('https://cdn.fluxer.app/icons/100/a_x9f2.png?size=1024'),
    'https://cdn.fluxer.app/icons/100/a_x9f2.gif?size=1024',
  );
});

test('assets estáticos e vazios passam intactos', () => {
  assert.equal(
    fixAnimatedAssetUrl('https://cdn.fluxer.app/icons/100/xyz.png'),
    'https://cdn.fluxer.app/icons/100/xyz.png',
  );
  assert.equal(
    fixAnimatedAssetUrl('https://cdn.fluxer.app/icons/100/a_semext'),
    'https://cdn.fluxer.app/icons/100/a_semext',
  );
  assert.equal(fixAnimatedAssetUrl(null), null);
  assert.equal(fixAnimatedAssetUrl(undefined), null);
});
