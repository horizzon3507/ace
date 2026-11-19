import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

test('tsx trata a query como outro módulo', async () => {
  const href = pathToFileURL(resolve('src/prefix.ts')).href;
  const first = await import(`${href}?ace=1`) as { prefix: () => string };
  const second = await import(`${href}?ace=2`) as { prefix: () => string };
  assert.equal(typeof first.prefix, 'function');
  assert.notEqual(first, second);
  assert.notEqual(first.prefix, second.prefix);
});

test('tsx isola query strings tambem para src/brand.ts', async () => {
  const href = pathToFileURL(resolve('src/brand.ts')).href;
  const first = await import(`${href}?ace=10`) as { brand: { primary: number } };
  const second = await import(`${href}?ace=11`) as { brand: { primary: number } };
  assert.notEqual(first, second);
  assert.equal(first.brand.primary, second.brand.primary);
});
