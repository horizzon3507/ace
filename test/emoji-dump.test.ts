import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot, type MockResourceOverrides } from 'yuzuha/testing';
import { emoji } from '../src/emoji.js';
import { buildZip } from '../src/emoji-dump.js';
import dumpemojis from '../commands/dumpemojis.js';

const makeEmojis = (count: number) => Array.from({ length: count }, (_, i) => ({
  id: `${1000 + i}`,
  name: `emoji_${i}`,
  animated: i % 5 === 0,
  url: null,
}));

const guild = { id: '7', name: 'Ace', ownerID: '1', iconURL: null, bannerURL: null, memberCount: 3, createdTimestamp: 0 };

function bot(count: number) {
  const resources: MockResourceOverrides = {
    expressions: { emojis: async () => makeEmojis(count) },
    users: { guild: async () => guild },
  };
  return createTestBot({ prefix: 'a.', commands: [dumpemojis], emoji, authorization: 'off', resources });
}

test('dumpemojis lista 15 emojis por página com nome e ID', async (t) => {
  const fixture = bot(32);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.dumpemojis'), 'success');
  const message = fixture.messages.at(-1)?.payload;
  const description = message?.embeds?.[0]?.description ?? '';
  const lines = description.split('\n');
  assert.equal(lines.length, 15);
  assert.match(lines[0], /<a:emoji_0:1000> `emoji_0` — ID `1000`/);
  assert.match(lines[1], /<:emoji_1:1001>/);
  assert.equal(message?.embeds?.[0]?.footer?.text, 'Página 1 de 3 — 32 emojis no total');
});

test('dumpemojis página 2 mostra a fatia seguinte', async (t) => {
  const fixture = bot(32);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.dumpemojis 2'), 'success');
  const description = fixture.messages.at(-1)?.payload.embeds?.[0]?.description ?? '';
  assert.match(description.split('\n')[0], /`emoji_15` — ID `1015`/);
  assert.equal(description.split('\n').length, 15);
  assert.match(fixture.messages.at(-1)?.payload.embeds?.[0]?.footer?.text ?? '', /Página 2 de 3/);
});

test('dumpemojis última página traz o resto', async (t) => {
  const fixture = bot(32);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.dumpemojis 3'), 'success');
  assert.equal(fixture.messages.at(-1)?.payload.embeds?.[0]?.description?.split('\n').length, 2);
});

test('dumpemojis página fora do alcance avisa o total', async (t) => {
  const fixture = bot(10);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.dumpemojis 9'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não conheço a página 9/);
});

test('dumpemojis sem emojis avisa', async (t) => {
  const fixture = bot(0);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.dumpemojis'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não tem emojis/);
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
