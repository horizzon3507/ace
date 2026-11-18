import test from 'node:test';
import assert from 'node:assert/strict';
import { embed } from 'yuzuha';
import { createTestBot } from 'yuzuha/testing';
import { defineCommand } from 'yuzuha';
import { emoji } from '../src/emoji.js';
import { startPaginator } from '../src/paginator.js';

const cmd = defineCommand({
  name: 'pag',
  run: async (ctx) => {
    const count = Number(ctx.tokens[0] ?? '0');
    const startPage = Number(ctx.tokens[1] ?? '0');
    const pages = Array.from({ length: count }, (_, i) => embed({ title: `P${i + 1}` }));
    await startPaginator(ctx, pages, { startPage });
  },
});

test('startPaginator trata lista vazia, pagina unica e clamp de startPage', async (t) => {
  const fixture = createTestBot({
    prefix: 'a.',
    commands: [cmd],
    emoji,
    resources: {
      collectors: { awaitReaction: async () => null },
      messages: { removeReaction: async () => undefined, clearReactions: async () => undefined },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.pag 0 0'), 'success');
  assert.equal(fixture.messages.length, 0);

  assert.equal(await fixture.send('a.pag 1 0'), 'success');
  assert.equal(fixture.messages.at(-1)?.payload.embeds?.[0]?.title, 'P1');
  assert.equal(fixture.transport.reactions.length, 0);

  assert.equal(await fixture.send('a.pag 3 99'), 'success');
  assert.equal(fixture.messages.at(-1)?.payload.embeds?.[0]?.title, 'P3');
});
