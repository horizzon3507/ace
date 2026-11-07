import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot } from 'yuzuha/testing';
import unban from '../commands/unban.js';

// MockTransport: autor '1' é dono/Admin rank 100, bot '999' rank 90. A lista de
// bans vem do mock — '7' está banido, qualquer outro ID não.
function bot() {
  return createTestBot({
    prefix: 'a.',
    commands: [unban],
    resources: {
      users: {
        async bans() {
          return [{ userID: '7', username: 'fulano', reason: 'spam' }];
        },
      },
    },
  });
}

test('unban por ID remove o ban e registra caso', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.unban 7 razão'), 'success');
  const action = fixture.transport.actions.at(-1);
  assert.equal(action?.action, 'unban');
  assert.equal(action?.targetID, '7');
  assert.equal(action?.reason, 'razão');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /desbanido/);
  assert.doesNotMatch(fixture.messages.at(-1)?.payload.content ?? '', /Caso/);
});

test('unban por nome resolve o ID pela lista de bans', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.unban fulano'), 'success');
  assert.equal(fixture.transport.actions.at(-1)?.action, 'unban');
  assert.equal(fixture.transport.actions.at(-1)?.targetID, '7');
});

test('ID fora da lista responde que não está banido', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.unban 8'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não está banido/);
  assert.equal(fixture.transport.actions.length, 0);
});

test('nome fora da lista responde que não encontrou', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.unban ninguem'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Eu não encontrei ninguém como ninguem/);
  assert.equal(fixture.transport.actions.length, 0);
});

test('sem argumento pede o membro', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.unban'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Por favor, me informe o membro a ser desbanido\.\.\./);
  assert.equal(fixture.transport.actions.length, 0);
});
