import test from 'node:test';
import assert from 'node:assert/strict';
import { brand, type BrandPalette } from '../src/brand.js';

test('brand e imutavel e contem cores RGB de 24 bits validas', () => {
  assert.equal(Object.isFrozen(brand), true);
  const palette: BrandPalette = brand;
  for (const [name, value] of Object.entries(palette)) {
    assert.equal(Number.isInteger(value), true, name);
    assert.ok(value >= 0 && value <= 0xffffff, `${name} fora de 0..0xffffff`);
  }
});
