import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot } from 'yuzuha/testing';
import type { MessageInfo } from 'yuzuha';
import clear from '../commands/clear.js';
import purge from '../commands/purge.js';
import { bindPurge } from '../src/purge.js';

// MockTransport: autor '1' (dono/Admin), bot '999' (Admin), canal padrão '200', guild '100'.
// Sem client nativo o runner sempre cai no fallback: list() mockada + delete por id.
function info(id: string, authorID = '1'): MessageInfo {
  return { id, channelID: '10', authorID, authorName: 'x', content: 'oi', createdTimestamp: 0, pinned: false, attachments: [], embeds: [] };
}

function bot(list: MessageInfo[], bulkDelete?: (ids: string[]) => Promise<string[]>) {
  return createTestBot({
    prefix: 'a.',
    commands: [clear, purge],
    resources: {
      messages: {
        async list(_channelID: string, limit?: number) {
          return list.slice(0, limit ?? list.length);
        },
        ...(bulkDelete ? { async bulkDelete(_c: string, ids: string[]) { return bulkDelete(ids); } } : {}),
      },
      // O wrapper autorizado valida canal + ManageMessages antes de chegar no recurso.
      ...(bulkDelete ? {
        channels: {
          async get(id: string) {
            return { id, name: 'geral', type: 0, guildID: '100', parentID: null, position: 0, topic: null, slowmode: 0, nsfw: false };
          },
        },
      } : {}),
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
    assert.match(content, /Por favor, me informe quantas mensagens apagar \(de 1 a 99\)\.\.\./, input);
    assert.match(content, /Ex: `a\.clear 20`/, input);
    fixture.clock.advance(4_000); // cooldown de 3s entre comandos
  }
});

test('clear apaga as mensagens listadas e conta só as que existiam', async (t) => {
  const fixture = bot([info('41'), info('42'), info('43')]);
  t.after(() => fixture.destroy());
  seed(fixture, '41', '42'); // '43' saiu da listagem antes do delete — NOT_FOUND não derruba a contagem.

  assert.equal(await fixture.send('a.clear 2'), 'success');
  const sent = fixture.messages.at(-1);
  assert.match(sent?.payload.content ?? '', /Eu apaguei \*\*2 mensagens\*\* deste canal!/);
  // A mensagem do comando foi apagada: a confirmação não pode referenciá-la.
  assert.equal(sent?.replyTo, undefined);
  assert.equal(fixture.messages.length, 1); // só sobrou a resposta
  assert.deepEqual(fixture.errors, []);
});

test('clear com 1 apagada usa o singular', async (t) => {
  const fixture = bot([info('41'), info('42')]);
  t.after(() => fixture.destroy());
  seed(fixture, '41'); // '42' estava na listagem, mas já não existia no canal.

  assert.equal(await fixture.send('a.clear 1'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Eu apaguei \*\*1 mensagem\*\* deste canal!/);
});

test('clear apaga num lote só quando o bulkDelete nativo responde', async (t) => {
  const batches: string[][] = [];
  const fixture = bot([info('41'), info('42'), info('43')], async (ids) => {
    batches.push(ids);
    return ids;
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.clear 2'), 'success');
  // A do comando ('1') entra no lote, mas fora da conta: 2 do canal.
  assert.deepEqual(batches, [['1', '41', '42']]);
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Eu apaguei \*\*2 mensagens\*\* deste canal!/);
});

test('purge em lote manda só as do alvo mais a do comando', async (t) => {
  const batches: string[][] = [];
  const fixture = bot([info('50', '2'), info('51', '7'), info('52', '2')], async (ids) => {
    batches.push(ids);
    return ids;
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.purge <@2> 2'), 'success');
  assert.deepEqual(batches, [['1', '50', '52']]);
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Eu apaguei \*\*2 mensagens\*\* de @2!/);
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
  assert.match(content, /Por favor, me informe o membro cujas mensagens apagar\.\.\./);
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
  const sent = fixture.messages.at(-1);
  assert.match(sent?.payload.content ?? '', /Eu apaguei \*\*2 mensagens\*\* de @2!/);
  assert.equal(sent?.replyTo, undefined);
  assert.ok(!fixture.messages.some((message) => message.id === '50'));
  assert.ok(fixture.messages.some((message) => message.id === '51')); // de outra autora — fica
  assert.ok(!fixture.messages.some((message) => message.id === '52'));
  assert.deepEqual(fixture.errors, []);
});

test('purge aceita a menção depois da quantidade', async (t) => {
  const fixture = bot([info('50', '2'), info('51', '7'), info('52', '2')]);
  t.after(() => fixture.destroy());
  seed(fixture, '50', '51', '52');

  assert.equal(await fixture.send('a.purge 2 <@2>'), 'success');
  const content = fixture.messages.at(-1)?.payload.content ?? '';
  assert.match(content, /Eu apaguei \*\*2 mensagens\*\* de @2!/);
  assert.ok(!fixture.messages.some((message) => message.id === '50'));
  assert.ok(fixture.messages.some((message) => message.id === '51')); // de outra autora — fica
  assert.ok(!fixture.messages.some((message) => message.id === '52'));
});

test('purge sem quantidade apaga até 10 do membro', async (t) => {
  const fixture = bot([...Array(12)].map((_, i) => info(String(60 + i), '2')));
  t.after(() => fixture.destroy());
  seed(fixture, ...[...Array(12)].map((_, i) => String(60 + i)));

  assert.equal(await fixture.send('a.purge <@2>'), 'success');
  const content = fixture.messages.at(-1)?.payload.content ?? '';
  assert.match(content, /Eu apaguei \*\*10 mensagens\*\* de @2!/);
  assert.equal(fixture.messages.length, 3); // 2 que sobraram + a resposta
});

test('a resposta de sucesso se apaga sozinha depois de 7s', async () => {
  const deleted: string[] = [];
  const scheduled: Array<[number, () => void]> = [];
  const run = bindPurge({
    emoji: { unhappy: 'u', purge: 'p' },
    after: (ms, fn) => { scheduled.push([ms, fn]); },
  });
  await run({
    requireGuild: () => '100',
    tokens: ['2'],
    channelID: '200',
    message: { id: 'cmd' },
    client: { channels: { resolve: async () => { throw new Error('sem client'); } } },
    resources: { messages: {
      list: async () => [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }],
      bulkDelete: async () => { throw new Error('nativo fora'); },
    } },
    transport: { delete: async (_c: string, id: string) => { deleted.push(id); } },
    send: async () => 'sent-1',
  } as unknown as Parameters<typeof run>[0], 'channel');
  assert.deepEqual(deleted, ['m1', 'm2', 'cmd']); // 2 do canal + a do comando, fora da conta
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0]?.[0], 7_000);
  scheduled[0]?.[1]();
  await Promise.resolve();
  assert.deepEqual(deleted, ['m1', 'm2', 'cmd', 'sent-1']);
});

test('fetch failed na confirmação retenta uma vez antes de desistir', async () => {
  const waits: number[] = [];
  let sends = 0;
  const run = bindPurge({
    emoji: { unhappy: 'u', purge: 'p' },
    after: () => {},
    wait: async (ms) => { waits.push(ms); },
  });
  await run({
    requireGuild: () => '100',
    tokens: ['2'],
    channelID: '200',
    message: { id: 'cmd' },
    client: { channels: { resolve: async () => { throw new Error('sem client'); } } },
    resources: { messages: {
      list: async () => [{ id: 'm1' }],
      bulkDelete: async () => { throw new Error('nativo fora'); },
    } },
    transport: { delete: async () => {} },
    send: async () => {
      sends += 1;
      if (sends === 1) throw new TypeError('fetch failed'); // socket morreu — REST não retenta POST
      return 'sent-1';
    },
  } as unknown as Parameters<typeof run>[0], 'channel');
  assert.equal(sends, 2); // primeira caiu, retentativa passou
  assert.deepEqual(waits, [750]);
});
