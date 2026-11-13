import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot, type MockResourceOverrides } from 'yuzuha/testing';
import { emoji } from '../src/emoji.js';
import { buildZip } from '../src/emoji-dump.js';
import emojilist from '../commands/emojilist.js';
import emojidump from '../commands/emojidump.js';
import iddrop from '../commands/iddrop.js';

const makeEmojis = (count: number) => Array.from({ length: count }, (_, i) => ({
  id: `${1000 + i}`,
  name: `emoji_${i}`,
  animated: i % 5 === 0,
  url: null,
}));

const guild = { id: '7', name: 'Ace', ownerID: '1', iconURL: null, bannerURL: null, memberCount: 3, createdTimestamp: 0 };

// Drena a cadeia de promises do paginador em background (tick só roda o scheduler).
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// Fila de votos: awaitReaction espera até o teste empurrar um clique, como o
// coletor real espera o gateway. Fila esgotada = escuta pendente (paginador vivo).
function voteQueue(initial: string[] = []) {
  const queue = [...initial];
  const waiters: (() => void)[] = [];
  return {
    push(emoji: string) { queue.push(emoji); waiters.shift()?.(); },
    collectors: {
      awaitReaction: async () => {
        while (queue.length === 0) await new Promise<void>((resolve) => waiters.push(resolve));
        return { userID: 'u1', emoji: queue.shift()!, messageID: '1' };
      },
    },
  };
}

function bot(count: number, votes: string[] = []) {
  const resources: MockResourceOverrides = {
    expressions: { emojis: async () => makeEmojis(count) },
    users: { guild: async () => guild },
    collectors: voteQueue(votes).collectors,
    messages: { removeReaction: async () => undefined, clearReactions: async () => undefined },
  };
  return createTestBot({ prefix: 'a.', commands: [emojilist, emojidump, iddrop], emoji, authorization: 'off', resources });
}

test('emojilist mostra 15 por página com nome e menção', async (t) => {
  const fixture = bot(32);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.emojilist'), 'success');
  const message = fixture.messages.at(-1)?.payload;
  const lines = (message?.embeds?.[0]?.description ?? '').split('\n');
  assert.equal(lines.length, 15);
  assert.equal(lines[0], '<a:emoji_0:1000> `<a:emoji_0:1000>`');
  assert.equal(lines[1], '<:emoji_1:1001> `<:emoji_1:1001>`');
  assert.equal(message?.embeds?.[0]?.footer?.text, 'Página 1 de 3 — 32 emojis no total');
});

test('emojilist reage com a seta de próxima página', async (t) => {
  const fixture = bot(32);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.emojilist'), 'success');
  const reacted = fixture.transport.reactions.map((r) => r.emoji);
  assert.deepEqual(reacted, ['<:arrowrightfill:1566639126151700482>']);
});

test('emojilist avança uma página a cada voto na seta', async (t) => {
  const fixture = bot(32, ['arrowrightfill', 'arrowrightfill']);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.emojilist'), 'success');
  await flush();
  const payload = fixture.messages.at(-1)?.payload;
  const lines = (payload?.embeds?.[0]?.description ?? '').split('\n');
  assert.match(lines[0], /^<a:emoji_30:1030> `<a:emoji_30:1030>`/);
  assert.match(payload?.embeds?.[0]?.footer?.text ?? '', /Página 3 de 3/);
});

test('emojilist volta à primeira página após a última', async (t) => {
  const fixture = bot(32, ['arrowrightfill', 'arrowrightfill', 'arrowrightfill']);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.emojilist'), 'success');
  await flush();
  const payload = fixture.messages.at(-1)?.payload;
  assert.match(payload?.embeds?.[0]?.footer?.text ?? '', /Página 1 de 3/);
});

test('emojilist servidor sem emojis avisa', async (t) => {
  const fixture = bot(0);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.emojilist'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não tem emojis para eu listar/);
});

test('emojidump sem arquivos baixáveis edita o espere', async (t) => {
  const fixture = bot(10);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.emojidump'), 'success');
  assert.equal(fixture.messages.length, 1);
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não consegui baixar os arquivos/);
});

test('emojidump servidor sem emojis avisa', async (t) => {
  const fixture = bot(0);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.emojidump'), 'success');
  assert.equal(fixture.messages.length, 1);
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não tem emojis para eu empacotar/);
});

test('iddrop junta todos os emojis em linha separada por vírgula', async (t) => {
  const fixture = bot(4);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.iddrop', { authorID: '1473035660161241245' }), 'success');
  assert.equal(
    fixture.messages.at(-1)?.payload.content,
    '<a:emoji_0:1000>,<:emoji_1:1001>,<:emoji_2:1002>,<:emoji_3:1003>',
  );
});

test('iddrop é só para o detentor e some do help', async (t) => {
  const fixture = bot(4);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.iddrop'), 'guarded');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /só para o meu detentor/);
  assert.equal(fixture.bot.help('a.').includes('iddrop'), false);
});

test('buildZip monta arquivo PK válido com entradas', () => {
  const zip = buildZip([
    { name: 'a.png', data: new Uint8Array([1, 2, 3]) },
    { name: 'b.gif', data: new Uint8Array([4, 5]) },
  ]);
  assert.equal(zip[0], 0x50); // P
  assert.equal(zip[1], 0x4b); // K
  assert.equal(zip[2], 0x03);
  assert.equal(zip[3], 0x04);
  const tail = new DataView(zip.buffer, zip.byteOffset + zip.length - 22, 22);
  assert.equal(tail.getUint32(0, true), 0x06054b50);
  assert.equal(tail.getUint16(8, true), 2);
  assert.equal(tail.getUint16(10, true), 2);
  const text = new TextDecoder().decode(zip);
  assert.ok(text.includes('a.png') && text.includes('b.gif'));
});
