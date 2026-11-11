import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot, type MockResourceOverrides } from 'yuzuha/testing';
import { emoji } from '../src/emoji.js';
import { buildZip } from '../src/emoji-dump.js';
import emojilist from '../commands/emojilist.js';
import emojidump from '../commands/emojidump.js';

const makeEmojis = (count: number) => Array.from({ length: count }, (_, i) => ({
  id: `${1000 + i}`,
  name: `emoji_${i}`,
  animated: i % 5 === 0,
  url: null,
}));

const guild = { id: '7', name: 'Ace', ownerID: '1', iconURL: null, bannerURL: null, memberCount: 3, createdTimestamp: 0 };

function bot(count: number, votes: string[] = []) {
  const resources: MockResourceOverrides = {
    expressions: { emojis: async () => makeEmojis(count) },
    users: { guild: async () => guild },
    collectors: {
      collectReactions: async function* () { for (const vote of votes) yield { userID: 'u1', emoji: vote, messageID: '1' }; },
    },
    messages: { removeReaction: async () => undefined, clearReactions: async () => undefined },
  };
  return createTestBot({ prefix: 'a.', commands: [emojilist, emojidump], emoji, authorization: 'off', resources });
}

test('emojilist mostra 15 por página com nome e menção', async (t) => {
  const fixture = bot(32);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.emojilist'), 'success');
  const message = fixture.messages.at(-1)?.payload;
  const lines = (message?.embeds?.[0]?.description ?? '').split('\n');
  assert.equal(lines.length, 15);
  assert.equal(lines[0], '<a:emoji_0:1000> emoji_0 | Menção: `<a:emoji_0:1000>`');
  assert.equal(lines[1], '<:emoji_1:1001> emoji_1 | Menção: `<:emoji_1:1001>`');
  assert.equal(message?.embeds?.[0]?.footer?.text, 'Página 1 de 3 — 32 emojis no total');
});

test('emojilist reage com setas de navegação', async (t) => {
  const fixture = bot(32);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.emojilist'), 'success');
  const reacted = fixture.transport.reactions.map((r) => r.emoji);
  assert.ok(reacted.includes('⬅️') && reacted.includes('➡️'));
});

test('emojilist vira a página ao votar ➡️', async (t) => {
  const fixture = bot(32, ['➡️']);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.emojilist'), 'success');
  const payload = fixture.messages.at(-1)?.payload;
  const lines = (payload?.embeds?.[0]?.description ?? '').split('\n');
  assert.match(lines[0], /^<a:emoji_15:1015> emoji_15 \| Menção/);
  assert.match(payload?.embeds?.[0]?.footer?.text ?? '', /Página 2 de 3/);
});

test('emojilist volta ao fim ao votar ⬅️ na primeira página', async (t) => {
  const fixture = bot(32, ['⬅️']);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.emojilist'), 'success');
  const payload = fixture.messages.at(-1)?.payload;
  assert.match(payload?.embeds?.[0]?.footer?.text ?? '', /Página 3 de 3/);
});

test('emojilist servidor sem emojis avisa', async (t) => {
  const fixture = bot(0);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.emojilist'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não tem emojis para eu listar/);
});

test('emojidump sem arquivos baixáveis avisa', async (t) => {
  const fixture = bot(10);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.emojidump'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não consegui baixar os arquivos/);
});

test('emojidump servidor sem emojis avisa', async (t) => {
  const fixture = bot(0);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.emojidump'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não tem emojis para eu empacotar/);
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
