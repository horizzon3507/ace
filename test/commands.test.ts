import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot, type MockResourceOverrides } from 'yuzuha/testing';
import { brand } from '../src/brand.js';
import { prefix } from '../src/prefix.js';
import ping from '../commands/ping.js';
import ajuda from '../commands/ajuda.js';
import guildavatar from '../commands/guildavatar.js';
import avatar from '../commands/avatar.js';
import userbanner from '../commands/userbanner.js';
import guildbanner from '../commands/guildbanner.js';

const commands = [ping, ajuda, guildavatar, avatar, userbanner, guildbanner];

function bot(resources?: MockResourceOverrides) {
  return createTestBot({ prefix: 'a.', commands, resources });
}

test('PREFIX define o prefixo e cai em a. quando falta', () => {
  const previous = process.env.PREFIX;
  delete process.env.PREFIX;
  assert.equal(prefix(), 'a.');
  process.env.PREFIX = '  zz.  ';
  assert.equal(prefix(), 'zz.');
  process.env.PREFIX = '   ';
  assert.equal(prefix(), 'a.');
  if (previous === undefined) delete process.env.PREFIX;
  else process.env.PREFIX = previous;
});

test('ping responde a latência', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.ping'), 'success');
  const message = fixture.messages.at(-1)?.payload;
  assert.equal(message?.embeds, undefined);
  assert.equal(message?.content, '<:globefill:1566571242956263426> Pong! A minha conexão com este servidor está **incrível** (**12**ms).');
});

test('mensagem sem o prefixo é ignorada', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('!ping'), 'ignored');
  assert.equal(fixture.messages.length, 0);
});

test('ajuda lista os comandos', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.ajuda'), 'success');
  const content = fixture.messages.at(-1)?.payload.embeds?.[0]?.description ?? '';
  assert.match(content, /ping/);
  assert.doesNotMatch(content, /hello/);
  assert.match(content, /guildavatar/);
  assert.match(content, /ajuda/);
  assert.match(content, /a\./);
});

test('guildavatar exibe o ícone do servidor', async (t) => {
  const fixture = bot({
    users: {
      async guild(guildID: string) {
        return {
          id: guildID,
          name: 'Comunidade Fluxer',
          ownerID: '1',
          iconURL: 'https://cdn.fluxer.app/icons/server.png',
          bannerURL: null,
          memberCount: 100,
          createdTimestamp: 0,
        };
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.guildavatar'), 'success');
  const embed = fixture.messages.at(-1)?.payload.embeds?.[0];
  assert.equal(embed?.color, brand.primary);
  assert.equal(embed?.title, 'Avatar de Comunidade Fluxer');
  assert.equal(embed?.image?.url, 'https://cdn.fluxer.app/icons/server.png');
});

test('guildavatar avisa quando o servidor não possui ícone', async (t) => {
  const fixture = bot({
    users: {
      async guild(guildID: string) {
        return {
          id: guildID,
          name: 'Sem Imagem',
          ownerID: '1',
          iconURL: null,
          bannerURL: null,
          memberCount: 5,
          createdTimestamp: 0,
        };
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.guildavatar'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não possui um ícone configurado/);
});
