import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot } from 'yuzuha/testing';
import kick from '../commands/kick.js';
import ban from '../commands/ban.js';
import { emoji } from '../src/emoji.js';

// MockTransport: autor '1' é dono/Admin rank 100, bot '999' rank 90, alvo '2' rank 1.
// O members.resolve nativo bate no users.member — só '1', '2', '5' e '999' existem.
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
    commands: [kick, ban],
    emoji,
    resources: {
      users: {
        async member(_guildID: string, id: string) {
          if (['1', '2', '5', '999'].includes(id)) return memberish(id);
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

test('alvo vem do primeiro token — menção no motivo não sequestra o ban', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  // '123456789' é o alvo; <@2> fica no motivo. ID sem membro → missing nativo.
  assert.equal(await fixture.send('a.ban 123456789 reportado por <@2>'), 'success');
  assert.equal(fixture.transport.actions.length, 0);
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não encontrei ninguém como 123456789/);
});

test('ban por menção usa a menção do primeiro token', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.ban <@2> spam por <@1>'), 'success');
  assert.equal(fixture.transport.actions.at(-1)?.targetID, '2');
  assert.equal(fixture.transport.actions.at(-1)?.reason, 'spam por');
});

test('não pode moderar a si mesmo', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.kick <@1>'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /me usar pra expulsar a si mesmo/);
  assert.equal(fixture.transport.actions.length, 0);
});

test('não pode moderar o próprio bot', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.kick <@999>'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não posso me expulsar do servidor/);
  assert.equal(fixture.transport.actions.length, 0);
});

test('hierarquia acima do bot bloqueia', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());
  fixture.transport.setMember('100', { id: '5', owner: false, permissions: 0n, rank: 500 });

  assert.equal(await fixture.send('a.kick <@5>'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /está acima do seu ou do meu/);
  assert.equal(fixture.transport.actions.length, 0);
});

test('autor sem permissão é barrado antes de agir', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());
  fixture.transport.setMember('100', { id: '1', owner: false, permissions: 0n, rank: 1 });

  assert.equal(await fixture.send('a.kick <@2>'), 'guarded');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /KickMembers/);
  assert.equal(fixture.transport.actions.length, 0);
});

test('sem argumento pede o membro', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.kick'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Por favor, me informe o membro a ser expulso\.\.\./);
});

test('nome desconhecido responde que não encontrou', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.ban fulaninho spam'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Eu não encontrei ninguém como fulaninho/);
});

test('ID sem membro vira missing com aviso', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.ban 123 spam'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não encontrei ninguém como 123/);
});

test('ban de ID fora do servidor responde sem erro cru', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.ban 777777 razão'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não encontrei ninguém como 777777/);
  assert.equal(fixture.transport.actions.length, 0);
});

test('falha da API propaga como erro honesto', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());
  fixture.transport.failAction = true;

  assert.equal(await fixture.send('a.ban <@2> spam'), 'error');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Não foi possível concluir o comando/);
  assert.ok(fixture.errors.length >= 1);
});

test('kick sem motivo usa o default e registra caso', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.kick <@2>'), 'success');
  assert.equal(fixture.transport.actions.at(-1)?.reason, 'Sem motivo informado.');
  assert.doesNotMatch(fixture.messages.at(-1)?.payload.content ?? '', /Caso/);
  assert.deepEqual(fixture.errors, []);
});
