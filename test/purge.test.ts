import test from 'node:test';
import assert from 'node:assert/strict';
import type { PurgeInput, PurgeResult } from 'yuzuha';
import { createTestBot } from 'yuzuha/testing';
import clear from '../commands/clear.js';
import purge from '../commands/purge.js';
import { emoji } from '../src/emoji.js';

type PurgeCall = { channelID: string } & PurgeInput;

function memberish(id: string, name = 'Ace') {
  return {
    id, username: name.toLowerCase(), displayName: name, bot: false,
    avatarURL: null, bannerURL: null, createdTimestamp: 0,
    nickname: null, joinedTimestamp: 0, roles: [], permissions: '0', timedOutUntil: null,
  };
}

/**
 * MockTransport: autor '1' (dono/Admin), bot '999' (Admin), canal '200', guild '100'.
 * authorization: 'off' — o que ctx.purge exige do ManageMessages fica pro yuzuha.
 * O mock do recurso registra a chamada e apaga include + `limit` das semeadas.
 */
function bot(impl?: (channelID: string, input: PurgeCall, fixture: { messages: { id: string; channelID: string; payload: unknown }[] }) => Partial<PurgeResult> | Promise<Partial<PurgeResult>>) {
  const calls: PurgeCall[] = [];
  let fixture: ReturnType<typeof createTestBot>;
  fixture = createTestBot({
    prefix: 'a.',
    commands: [clear, purge],
    emoji,
    authorization: 'off',
    resources: {
      users: {
        async member(_g: string, id: string) { return memberish(id); },
        async user(id: string) { return memberish(id); },
        async searchMembers() { return { members: [], total: 0, hasMore: false, indexing: false }; },
        async members() { return []; },
      },
      messages: {
        async purge(channelID: string, input: PurgeInput) {
          calls.push({ channelID, ...input });
          if (impl) return { deletedIDs: [], via: 'bulk', deleted: 0, ...(await impl(channelID, { channelID, ...input }, fixture)) };
          const included = new Set(input.include ?? []);
          const drop = (id: string) => {
            const index = fixture.messages.findIndex((message) => message.id === id);
            if (index >= 0) fixture.messages.splice(index, 1);
          };
          for (const id of included) drop(id);
          const victims = fixture.messages.filter((message) => !included.has(message.id)).slice(0, input.limit);
          for (const victim of victims) drop(victim.id);
          return { deleted: victims.length, deletedIDs: victims.map((message) => message.id), via: 'bulk' };
        },
      },
    },
  });
  return { fixture, calls };
}

/** "Publica" mensagens no canal — o mock de purge remove a partir daqui. */
function seed(fixture: { messages: { id: string; channelID: string; payload: { content?: string } }[] }, ...ids: string[]) {
  for (const id of ids) fixture.messages.push({ id, channelID: '200', payload: { content: 'oi' } });
}

test('clear exige uma quantidade de 1 a 99', async (t) => {
  const { fixture } = bot();
  t.after(() => fixture.destroy());

  for (const input of ['a.clear', 'a.clear abc', 'a.clear 0', 'a.clear 100']) {
    assert.equal(await fixture.send(input), 'success');
    const content = fixture.messages.at(-1)?.payload.content ?? '';
    assert.match(content, /Por favor, me informe quantas mensagens apagar \(de 1 a 99\)\.\.\./, input);
    assert.match(content, /Ex: `a\.clear 20`/, input);
    fixture.clock.advance(4_000); // cooldown de 3s entre comandos
  }
});

test('clear apaga em um ctx.purge com a mensagem do comando incluída', async (t) => {
  const { fixture, calls } = bot();
  t.after(() => fixture.destroy());
  seed(fixture, '41', '42', '43');

  assert.equal(await fixture.send('a.clear 2'), 'success');
  assert.deepEqual(calls, [{ channelID: '200', limit: 2, authorID: undefined, include: ['1'] }]);
  const sent = fixture.messages.at(-1);
  assert.match(sent?.payload.content ?? '', /Eu apaguei \*\*2 mensagens\*\* deste canal!/);
  assert.equal(sent?.replyTo, undefined);
});

test('clear com 1 apagada usa o singular', async (t) => {
  const { fixture } = bot();
  t.after(() => fixture.destroy());
  seed(fixture, '41');

  assert.equal(await fixture.send('a.clear 1'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Eu apaguei \*\*1 mensagem\*\* deste canal!/);
});

test('purge manda o alvo em authorID e a mensagem do comando fora da conta', async (t) => {
  const { fixture, calls } = bot();
  t.after(() => fixture.destroy());
  seed(fixture, '50', '51');

  assert.equal(await fixture.send('a.purge <@2> 2'), 'success');
  assert.deepEqual(calls, [{ channelID: '200', limit: 2, authorID: '2', include: ['1'] }]);
  // O nome do membro vem resolvido — nada de snowflake cru.
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Eu apaguei \*\*2 mensagens\*\* de @Ace!/);
});

test('purge aceita a menção depois da quantidade', async (t) => {
  const { fixture, calls } = bot();
  t.after(() => fixture.destroy());
  seed(fixture, '50', '51');

  assert.equal(await fixture.send('a.purge 2 <@2>'), 'success');
  assert.deepEqual(calls, [{ channelID: '200', limit: 2, authorID: '2', include: ['1'] }]);
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Eu apaguei \*\*2 mensagens\*\* de @Ace!/);
});

test('purge sem quantidade apaga até 10 do membro', async (t) => {
  const { fixture, calls } = bot();
  t.after(() => fixture.destroy());
  seed(fixture, '50');

  assert.equal(await fixture.send('a.purge <@2>'), 'success');
  assert.deepEqual(calls, [{ channelID: '200', limit: 10, authorID: '2', include: ['1'] }]);
});

test('clear sem nada apagável admite que não encontrou', async (t) => {
  const { fixture } = bot(async () => ({ deleted: 0 }));
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.clear 2'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não encontrei mensagens para apagar/);
});

test('purge sem membro mostra o uso', async (t) => {
  const { fixture } = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.purge'), 'success');
  const content = fixture.messages.at(-1)?.payload.content ?? '';
  assert.match(content, /Por favor, me informe o membro cujas mensagens apagar\.\.\./);
  assert.match(content, /Ex: `a\.purge @usuario 10`/);
});

test('purge de nome desconhecido responde que não encontrou', async (t) => {
  const { fixture } = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.purge ninguem'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não encontrei ninguém como ninguem/);
});

test('purge com quantidade inválida repete o uso de contagem', async (t) => {
  const { fixture } = bot();
  t.after(() => fixture.destroy());

  for (const input of ['a.purge <@2> 0', 'a.purge <@2> abc', 'a.purge <@2> 100']) {
    assert.equal(await fixture.send(input), 'success');
    assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Por favor, me informe quantas mensagens apagar/, input);
    fixture.clock.advance(4_000); // cooldown de 3s entre comandos
  }
});

test('a resposta de sucesso se apaga sozinha depois de 7s', async (t) => {
  const { fixture } = bot();
  t.after(() => fixture.destroy());
  seed(fixture, '41', '42');

  assert.equal(await fixture.send('a.clear 2'), 'success');
  const sent = fixture.messages.at(-1);
  assert.equal(sent?.payload.content === undefined, false);

  fixture.timers.advance(7_000);
  assert.ok(!fixture.messages.some((message) => message.id === sent?.id));
});

test('fallback por-id do recurso não muda a confirmação', async (t) => {
  const { fixture } = bot(async () => ({ deleted: 2, via: 'each' }));
  t.after(() => fixture.destroy());
  seed(fixture, '41', '42');

  assert.equal(await fixture.send('a.clear 2'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Eu apaguei \*\*2 mensagens\*\* deste canal!/);
});
