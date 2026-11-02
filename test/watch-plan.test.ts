import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyChange } from '../src/watch-plan.js';

test('classifica o que a cli recarrega', () => {
  assert.equal(classifyChange('commands/ping.ts'), 'commands');
  assert.equal(classifyChange('commands/nested/extra.mts'), 'commands');
  assert.equal(classifyChange('src/mention.ts'), 'runtime');
  assert.equal(classifyChange('src/prefix.ts'), 'runtime');
  assert.equal(classifyChange('src/brand.ts'), 'runtime');
  assert.equal(classifyChange('src/join-role.ts'), 'runtime');
  assert.equal(classifyChange('.env'), 'env');
  assert.equal(classifyChange('yuzuha.config.ts'), 'restart');
  assert.equal(classifyChange('src/cli.ts'), 'restart');
  assert.equal(classifyChange('src/term.ts'), 'restart');
  assert.equal(classifyChange('src/live.ts'), 'restart');
  assert.equal(classifyChange('commands/ping.d.ts'), 'ignore');
  assert.equal(classifyChange('node_modules/yuzuha/dist/cli.js'), 'ignore');
  assert.equal(classifyChange('assets/ace.svg'), 'ignore');
  assert.equal(classifyChange('test/mention.test.ts'), 'ignore');
  assert.equal(classifyChange('README.md'), 'ignore');
  assert.equal(classifyChange('.env.swp'), 'ignore');
});
