import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot } from 'yuzuha/testing';
import iddrop from '../commands/iddrop.js';
import { emoji } from '../src/emoji.js';

test('iddrop divide em multiplas mensagens acima de 1900 caracteres e aceita owners da config', async (t) => {
  const many = Array.from({ length: 120 }, (_, i) => ({
    id: `${100000000000000000n + BigInt(i)}`,
    name: `emoji_longo_${i}`,
    animated: false,
    url: null,
  }));
  const fixture = createTestBot({
    prefix: 'a.',
    commands: [iddrop],
    emoji,
    owners: ['42'],
    resources: { expressions: { emojis: async () => many } },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.iddrop', { authorID: '42' }), 'success');
  assert.ok(fixture.messages.length >= 2);
});
