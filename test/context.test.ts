import test from 'node:test';
import assert from 'node:assert/strict';
import { defineCommand } from 'yuzuha';
import { createTestBot } from 'yuzuha/testing';
import type { AceContext } from '../src/context.js';
import { emoji } from '../src/emoji.js';

test('AceContext aceita CommandContext completo da yuzuha 0.7.0 com owners e locale', async (t) => {
  let seenOwner = false;
  let seenLocale = '';
  const probe = defineCommand({
    name: 'probe',
    run: async (ctx) => {
      const ace: AceContext = ctx;
      seenOwner = ace.isOwner?.() ?? false;
      seenLocale = ace.locale ?? '';
      await ace.reply('ok');
    },
  });

  const fixture = createTestBot({ prefix: 'a.', commands: [probe], emoji, owners: ['1'] });
  t.after(() => fixture.destroy());
  assert.equal(await fixture.send('a.probe'), 'success');
  assert.equal(seenOwner, true);
  assert.equal(seenLocale, 'pt-BR');
});
