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
  assert.equal(classifyChange('src/punish.ts'), 'runtime');
  assert.equal(classifyChange('src/resolve.ts'), 'runtime');
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

test('emoji recarrega e sujeira de editor é ignorada', () => {
  assert.equal(classifyChange('src/emoji.ts'), 'runtime');
  assert.equal(classifyChange('src/foo.test.ts'), 'ignore');
  assert.equal(classifyChange('commands/x.test.ts'), 'ignore');
  assert.equal(classifyChange('src/deep/bar.spec.ts'), 'ignore');
  assert.equal(classifyChange('.env.local'), 'ignore');
  assert.equal(classifyChange('.env.production'), 'ignore');
});

test('diretório de comandos é configurável', () => {
  assert.equal(classifyChange('src/cmds/x.ts', 'src/cmds'), 'commands');
  assert.equal(classifyChange('src/cmds/deep/x.mts', 'src/cmds'), 'commands');
  assert.equal(classifyChange('other/x.ts', 'src/cmds'), 'ignore');
  assert.equal(classifyChange('src/cmds/readme.md', 'src/cmds'), 'ignore');
});
