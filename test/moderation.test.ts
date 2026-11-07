import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot } from 'yuzuha/testing';
import kick from '../commands/kick.js';
import ban from '../commands/ban.js';

// MockTransport: autor '1' é dono/Admin rank 100, bot '999' rank 90, alvo '2' rank 1.
function bot() {
  return createTestBot({ prefix: 'a.', commands: [kick, ban] });
}

test('alvo vem do primeiro token — menção no motivo não sequestra o ban', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  // '123456789' é o alvo; <@2> fica no motivo. Alvo fora do servidor → MEMBER_NOT_FOUND.
  assert.equal(await fixture.send('a.ban 123456789 reportado por <@2>'), 'success');
  assert.equal(fixture.transport.actions.length, 0);
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não está mais neste servidor/);
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

test('ID curto demais vira missing com aviso', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.ban 123 spam'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /curto demais/);
});

test('ban de quem não está no servidor responde sem erro cru', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.ban 777777 razão'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não está mais neste servidor/);
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
