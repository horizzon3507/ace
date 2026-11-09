import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot } from 'yuzuha/testing';
import timeout from '../commands/timeout.js';
import { emoji } from '../src/emoji.js';

// MockTransport: autor '1' é dono/Admin rank 100, bot '999' rank 90, alvo '2' rank 1.
// O members.resolve nativo bate no users.member — '1', '2' e '999' existem.
function memberish(id: string) {
  return {
    id, username: `user${id}`, displayName: `User${id}`, bot: false,
    avatarURL: null, bannerURL: null, createdTimestamp: 0,
    nickname: null, joinedTimestamp: 0, roles: [], permissions: '0', timedOutUntil: null,
  };
}

function bot() {
  return createTestBot({
    prefix: 'a.',
    commands: [timeout],
    emoji,
    resources: {
      users: {
        async member(_guildID: string, id: string) {
          if (['1', '2', '999'].includes(id)) return memberish(id);
          throw Object.assign(new Error('Unknown Member'), { status: 404 });
        },
        async searchMembers() {
          return { members: [], total: 0, hasMore: false, indexing: false };
        },
        async members() {
          return [];
        },
      },
    },
  });
}

test('timeout por menção silencia e registra caso', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.timeout <@2> 10m spam'), 'success');
  const action = fixture.transport.actions.at(-1);
  assert.equal(action?.action, 'timeout');
  assert.equal(action?.targetID, '2');
  assert.equal(action?.reason, 'spam');
  assert.equal(action?.duration, 600_000);
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /silenciado/);
  assert.doesNotMatch(fixture.messages.at(-1)?.payload.content ?? '', /Caso/);
});

test('sem argumento pede o membro', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.timeout'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Por favor, me informe o membro a ser silenciado\.\.\./);
  assert.equal(fixture.transport.actions.length, 0);
});

test('sem duração pede a duração do silenciamento', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.timeout <@2>'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Por favor, me informe a duração do silenciamento\.\.\./);
  assert.equal(fixture.transport.actions.length, 0);
});

test('duração inválida pede a duração do silenciamento', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.timeout <@2> banana'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Por favor, me informe a duração do silenciamento\.\.\./);
  assert.equal(fixture.transport.actions.length, 0);
});

test('não pode silenciar a si mesmo', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.timeout <@1> 10m'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /me usar pra silenciar a si mesmo/);
  assert.equal(fixture.transport.actions.length, 0);
});

test('não pode silenciar o próprio bot', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.timeout <@999> 10m'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não posso me silenciar do servidor/);
  assert.equal(fixture.transport.actions.length, 0);
});

test('duração acima de 28 dias é recusada', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.timeout <@2> 99d'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não pode passar de 28 dias/);
  assert.equal(fixture.transport.actions.length, 0);
});

test('autor sem permissão é barrado antes de agir', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());
  fixture.transport.setMember('100', { id: '1', owner: false, permissions: 0n, rank: 1 });

  assert.equal(await fixture.send('a.timeout <@2> 10m'), 'guarded');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /ModerateMembers/);
  assert.equal(fixture.transport.actions.length, 0);
});
