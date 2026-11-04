import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot } from 'yuzuha/testing';
import type { ChannelInfo, ChannelOverwriteInput, RoleInfo } from 'yuzuha';
import lock from '../commands/lock.js';
import unlock from '../commands/unlock.js';

// MockTransport: autor '1' (dono/Admin), bot '999' (Admin), canal padrão '200', guild '100'.
const calls: { channelID: string; targetID: string; input: ChannelOverwriteInput }[] = [];

function channelInfo(id: string, type: number): ChannelInfo {
  return { id, name: 'geral', type, guildID: '100', parentID: null, position: 0, topic: null, slowmode: 0, nsfw: false };
}

// @everyone tem id === guildID; managed:false passa no roleHierarchy do resource-authorization.
const everyone: RoleInfo = { id: '100', name: '@everyone', color: 0, position: 0, permissions: '0', hoist: false, mentionable: false, unicodeEmoji: null, managed: false };

function bot(types: Record<string, number> = { '200': 0 }) {
  calls.length = 0;
  return createTestBot({
    prefix: 'a.',
    commands: [lock, unlock],
    resources: {
      channels: {
        async get(id: string) {
          const type = types[id];
          if (type === undefined) throw new Error('channel not found');
          return channelInfo(id, type);
        },
        async overwrite(channelID: string, targetID: string, input: ChannelOverwriteInput) {
          calls.push({ channelID, targetID, input });
        },
      },
      roles: {
        async list(_guildID: string) {
          return [everyone];
        },
      },
    },
  });
}

test('lock sem alvo tranca o canal atual para @everyone', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.lock'), 'success');
  assert.equal(calls.at(-1)?.channelID, '200');
  assert.equal(calls.at(-1)?.targetID, '100');
  assert.deepEqual(calls.at(-1)?.input.deny, ['SendMessages']);
  const content = fixture.messages.at(-1)?.payload.content ?? '';
  assert.match(content, /Canal \*\*trancado\*\*!/);
  assert.match(content, /aqui por enquanto/);
});

test('lock com menção tranca outro canal e leva o motivo', async (t) => {
  const fixture = bot({ '9': 0 });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.lock <#9> flood demais'), 'success');
  assert.equal(calls.at(-1)?.channelID, '9');
  assert.equal(calls.at(-1)?.input.reason, 'Hory: flood demais');
  const content = fixture.messages.at(-1)?.payload.content ?? '';
  assert.match(content, /Canal <#9> \*\*trancado\*\*!/);
  assert.match(content, /lá por enquanto/);
  assert.match(content, /Motivo: flood demais/);
});

test('lock com ID cru tranca o canal', async (t) => {
  const fixture = bot({ '123456789012345678': 0 });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.lock 123456789012345678'), 'success');
  assert.equal(calls.at(-1)?.channelID, '123456789012345678');
});

test('canal inexistente responde que não encontrou', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.lock <#42>'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não encontrei\*\* nenhum canal como \*\*<#42>\*\*/);
  assert.equal(calls.length, 0);
});

test('canal de voz é recusado pelo tipo', async (t) => {
  const fixture = bot({ '7': 2 });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.lock <#7>'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /esse tipo de canal\*\*/);
  assert.equal(calls.length, 0);
});

test('unlock sem alvo destranca o canal atual', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.unlock'), 'success');
  assert.equal(calls.at(-1)?.channelID, '200');
  assert.deepEqual(calls.at(-1)?.input.allow, ['SendMessages']);
  const content = fixture.messages.at(-1)?.payload.content ?? '';
  assert.match(content, /Canal \*\*destrancado\*\*!/);
  assert.match(content, /liberadas novamente/);
});

test('unlock com menção destranca outro canal', async (t) => {
  const fixture = bot({ '9': 0 });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.unlock <#9>'), 'success');
  assert.equal(calls.at(-1)?.channelID, '9');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Canal <#9> \*\*destrancado\*\*!/);
});
