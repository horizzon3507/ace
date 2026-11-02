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
