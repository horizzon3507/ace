import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot } from 'yuzuha/testing';
import type { MessageInfo } from 'yuzuha';
import clear from '../commands/clear.js';
import purge from '../commands/purge.js';

// MockTransport: autor '1' (dono/Admin), bot '999' (Admin), canal padrão '200', guild '100'.
// Sem client nativo o runner sempre cai no fallback: list() mockada + delete por id.
function info(id: string, authorID = '1'): MessageInfo {
  return { id, channelID: '10', authorID, authorName: 'x', content: 'oi', createdTimestamp: 0, pinned: false, attachments: [], embeds: [] };
}

function bot(list: MessageInfo[]) {
  return createTestBot({
    prefix: 'a.',
    commands: [clear, purge],
    resources: {
      messages: {
        async list(_channelID: string, limit?: number) {
          return list.slice(0, limit ?? list.length);
        },
      },
    },
  });
}

/** "Publica" mensagens no transporte — o delete por id só remove o que estiver aqui. */
function seed(fixture: ReturnType<typeof bot>, ...ids: string[]) {
  for (const id of ids) fixture.messages.push({ id, channelID: '200', payload: { content: 'oi' } });
}

test('clear exige uma quantidade de 1 a 99', async (t) => {
  const fixture = bot([]);
  t.after(() => fixture.destroy());

  for (const input of ['a.clear', 'a.clear abc', 'a.clear 0', 'a.clear 100']) {
    assert.equal(await fixture.send(input), 'success');
    const content = fixture.messages.at(-1)?.payload.content ?? '';
    assert.match(content, /Por favor, me informe quantas mensagens apagar \(de 1 a 99\)!/, input);
    assert.match(content, /Ex: `a\.clear 20`/, input);
    fixture.clock.advance(4_000); // cooldown de 3s entre comandos
  }
});

test('clear apaga as mensagens listadas e conta só as que existiam', async (t) => {
  const fixture = bot([info('41'), info('42'), info('43')]);
  t.after(() => fixture.destroy());
  seed(fixture, '41', '42'); // '43' saiu da listagem antes do delete — NOT_FOUND não derruba a contagem.

  assert.equal(await fixture.send('a.clear 2'), 'success');
  const content = fixture.messages.at(-1)?.payload.content ?? '';
  assert.match(content, /\*\*2 mensagens apagadas\*\*!/);
  assert.equal(fixture.messages.length, 1); // só sobrou a resposta
  assert.deepEqual(fixture.errors, []);
});

test('clear com 1 apagada usa o singular', async (t) => {
  const fixture = bot([info('41'), info('42')]);
  t.after(() => fixture.destroy());
  seed(fixture, '41'); // '42' estava na listagem, mas já não existia no canal.

  assert.equal(await fixture.send('a.clear 1'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /\*\*1 mensagem apagada\*\*!/);
});

test('clear sem nada apagável admite que não encontrou', async (t) => {
  const fixture = bot([info('98'), info('99'), info('97')]);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.clear 2'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não encontrei mensagens para apagar/);
  assert.equal(fixture.messages.length, 1);
});

test('purge sem membro mostra o uso', async (t) => {
  const fixture = bot([]);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.purge'), 'success');
  const content = fixture.messages.at(-1)?.payload.content ?? '';
  assert.match(content, /Por favor, me informe o membro cujas mensagens apagar!/);
  assert.match(content, /Ex: `a\.purge @usuario 10`/);
});

test('purge de nome desconhecido responde que não encontrou', async (t) => {
  const fixture = bot([]);
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.purge ninguem'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não encontrei ninguém como ninguem/);
});

test('purge com quantidade inválida repete o uso de contagem', async (t) => {
  const fixture = bot([]);
  t.after(() => fixture.destroy());

  for (const input of ['a.purge <@2> 0', 'a.purge <@2> abc', 'a.purge <@2> 100']) {
    assert.equal(await fixture.send(input), 'success');
    assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Por favor, me informe quantas mensagens apagar/, input);
    fixture.clock.advance(4_000); // cooldown de 3s entre comandos
  }
});

test('purge apaga só as mensagens do membro alvo', async (t) => {
  const fixture = bot([info('50', '2'), info('51', '7'), info('52', '2')]);
  t.after(() => fixture.destroy());
  seed(fixture, '50', '51', '52');

  assert.equal(await fixture.send('a.purge <@2> 2'), 'success');
  const content = fixture.messages.at(-1)?.payload.content ?? '';
  assert.match(content, /\*\*2 mensagens apagadas\*\*! Só as de \*\*2\*\*/);
  assert.ok(!fixture.messages.some((message) => message.id === '50'));
  assert.ok(fixture.messages.some((message) => message.id === '51')); // de outra autora — fica
  assert.ok(!fixture.messages.some((message) => message.id === '52'));
  assert.deepEqual(fixture.errors, []);
});

test('purge sem quantidade apaga até 10 do membro', async (t) => {
  const fixture = bot([...Array(12)].map((_, i) => info(String(60 + i), '2')));
  t.after(() => fixture.destroy());
  seed(fixture, ...[...Array(12)].map((_, i) => String(60 + i)));

  assert.equal(await fixture.send('a.purge <@2>'), 'success');
  const content = fixture.messages.at(-1)?.payload.content ?? '';
  assert.match(content, /\*\*10 mensagens apagadas\*\*! Só as de \*\*2\*\*/);
  assert.equal(fixture.messages.length, 3); // 2 que sobraram + a resposta
});
