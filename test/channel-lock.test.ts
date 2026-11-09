import test from 'node:test';
import assert from 'node:assert/strict';
import type { ChannelInfo } from 'yuzuha';
import { createTestBot } from 'yuzuha/testing';
import lock from '../commands/lock.js';
import unlock from '../commands/unlock.js';
import { emoji } from '../src/emoji.js';

// MockTransport: autor '1' (dono/Admin), bot '999' (Admin), canal padrão '200', guild '100'.
// authorization: 'off' — a cadeia de ManageChannels/hierarquia fica pro yuzuha.
type LockCall = { channelID: string; options?: { permission?: string; targetID?: string; reason?: string } };
const calls: { action: string; channelID: string; options?: LockCall['options'] }[] = [];

function channelInfo(id: string, type: number): ChannelInfo {
  return { id, name: 'geral', type, guildID: '100', parentID: null, position: 0, topic: null, slowmode: 0, nsfw: false };
}

function bot(types: Record<string, number> = { '200': 0 }) {
  calls.length = 0;
  return createTestBot({
    prefix: 'a.',
    commands: [lock, unlock],
    emoji,
    authorization: 'off',
    resources: {
      channels: {
        async get(id: string) {
          const type = types[id];
          if (type === undefined) throw new Error('channel not found');
          return channelInfo(id, type);
        },
        async lock(channelID: string, options?: LockCall['options']) {
          const type = types[channelID] ?? 0;
          calls.push({ action: 'lock', channelID, options });
          return { channelID, targetID: '100', permission: type === 2 ? 'Connect' : 'SendMessages', locked: true };
        },
        async unlock(channelID: string, options?: LockCall['options']) {
          const type = types[channelID] ?? 0;
          calls.push({ action: 'unlock', channelID, options });
          return { channelID, targetID: '100', permission: type === 2 ? 'Connect' : 'SendMessages', locked: false };
        },
      },
    },
  });
}

test('lock sem alvo tranca o canal atual para @everyone', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.lock'), 'success');
  assert.equal(calls.at(-1)?.action, 'lock');
  assert.equal(calls.at(-1)?.channelID, '200');
  const content = fixture.messages.at(-1)?.payload.content ?? '';
  assert.match(content, /Canal \*\*trancado\*\*!/);
  assert.match(content, /aqui por enquanto/);
});

test('lock com menção tranca outro canal e leva o motivo', async (t) => {
  const fixture = bot({ '9': 0 });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.lock <#9> flood demais'), 'success');
  assert.equal(calls.at(-1)?.channelID, '9');
  assert.equal(calls.at(-1)?.options?.reason, 'Hory: flood demais');
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
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não encontrei nenhum canal como <#42>/);
  assert.equal(calls.length, 0);
});

test('canal de voz tranca com deny de Connect', async (t) => {
  const fixture = bot({ '7': 2 });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.lock <#7>'), 'success');
  assert.equal(calls.at(-1)?.channelID, '7');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /consegue entrar lá/);
});

test('canal de anúncio tranca com deny de SendMessages', async (t) => {
  const fixture = bot({ '8': 5 });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.lock <#8>'), 'success');
  assert.equal(calls.at(-1)?.channelID, '8');
});

test('categoria é recusada pelo tipo', async (t) => {
  const fixture = bot({ '7': 4 });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.lock <#7>'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /este tipo de canal/);
  assert.equal(calls.length, 0);
});

test('unlock sem alvo destranca o canal atual', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.unlock'), 'success');
  assert.equal(calls.at(-1)?.action, 'unlock');
  assert.equal(calls.at(-1)?.channelID, '200');
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
