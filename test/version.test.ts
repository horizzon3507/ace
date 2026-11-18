import test from 'node:test';
import assert from 'node:assert/strict';
import { readPackageVersion, version } from '../src/version.js';

test('version e readPackageVersion retornam semver do pacote e fallback seguro', () => {
  assert.match(version, /^\d+\.\d+\.\d+/);
  assert.equal(readPackageVersion('package.json'), version);
  assert.equal(readPackageVersion('arquivo-inexistente.json', '9.9.9'), '9.9.9');
  assert.match(readPackageVersion('node_modules/yuzuha/package.json', 'unknown'), /^0\.7\./);
});
