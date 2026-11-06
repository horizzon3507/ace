import test from 'node:test';
import assert from 'node:assert/strict';
import type { Embed } from 'yuzuha';
import { createTestBot, type MockResourceOverrides } from 'yuzuha/testing';
import { brand } from '../src/brand.js';
import userinfo from '../commands/userinfo.js';
import guildinfo from '../commands/guildinfo.js';

const commands = [userinfo, guildinfo];

function bot(resources?: MockResourceOverrides) {
  return createTestBot({ prefix: 'a.', commands, resources });
}

function field(embed: Embed | undefined, name: string) {
  return embed?.fields?.find((item) => item.name === name);
}

const glacial = {
  id: '2',
  username: 'glacial',
  displayName: 'Glacial',
  bot: false,
  avatarURL: null,
  bannerURL: null,
  createdTimestamp: 0,
  nickname: 'Glacial',
  joinedTimestamp: 0,
  roles: ['50', '60'],
  permissions: '0',
  timedOutUntil: null,
};

const comunidade = {
  id: '100',
  name: 'Comunidade Fluxer',
  ownerID: '1',
  iconURL: 'https://cdn.fluxer.app/icons/server.png',
  bannerURL: null,
  memberCount: 42,
  createdTimestamp: 0,
};

function assertUserInfoEmbed(embed: Embed | undefined) {
  assert.equal(embed?.color, brand.primary);
  assert.equal(embed?.author?.name, 'Glacial');
  for (const name of ['Usuário', 'ID', 'Apelido', 'Conta criada', 'Entrou no servidor', 'Cargos']) {
    assert.ok(field(embed, name), `faltou o campo ${name}`);
  }
  assert.equal(field(embed, 'Usuário')?.value, '@glacial');
  assert.equal(field(embed, 'ID')?.value, '2');
  assert.equal(field(embed, 'Apelido')?.value, 'Glacial');
  assert.equal(field(embed, 'Cargos')?.value, '<@&50> <@&60>');
  assert.equal(field(embed, 'Silenciado até'), undefined);
}

test('userinfo sem argumento mostra o autor em embed', async (t) => {
  const fixture = bot({
    users: {
      async member() {
        return glacial;
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.userinfo'), 'success');
  assertUserInfoEmbed(fixture.messages.at(-1)?.payload.embeds?.[0]);
  assert.deepEqual(fixture.errors, []);
});

test('userinfo por menção mostra o mesmo embed', async (t) => {
  const fixture = bot({
    users: {
      async member() {
        return glacial;
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.userinfo <@2>'), 'success');
  assertUserInfoEmbed(fixture.messages.at(-1)?.payload.embeds?.[0]);
  assert.deepEqual(fixture.errors, []);
});

test('userinfo cai para o usuário global quando o membro falha', async (t) => {
  const fixture = bot({
    users: {
      async member() {
        throw new Error('fora do servidor');
      },
      async user() {
        return {
          id: '2',
          username: 'glacial',
          displayName: 'Glacial',
          bot: false,
          avatarURL: null,
          bannerURL: null,
          createdTimestamp: 0,
        };
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.userinfo <@2>'), 'success');
  const embed = fixture.messages.at(-1)?.payload.embeds?.[0];
  assert.equal(embed?.author?.name, 'Glacial');
  assert.ok(field(embed, 'Conta criada'), 'faltou o campo Conta criada');
  assert.equal(field(embed, 'Entrou no servidor'), undefined);
  assert.equal(field(embed, 'Apelido'), undefined);
  assert.equal(field(embed, 'Cargos'), undefined);
  assert.deepEqual(fixture.errors, []);
});

test('userinfo avisa quando membro e usuário falham', async (t) => {
  const fixture = bot({
    users: {
      async member() {
        throw new Error('fora do servidor');
      },
      async user() {
        throw new Error('não existe');
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.userinfo <@2>'), 'success');
  const content = fixture.messages.at(-1)?.payload.content ?? '';
  assert.match(content, /não consegui\*\* carregar as informações deste usuário/);
});

test('userinfo mostra silenciamento só quando ele é futuro', async (t) => {
  const future = bot({
    users: {
      async member() {
        return { ...glacial, timedOutUntil: Date.now() + 60_000 };
      },
    },
  });
  t.after(() => future.destroy());

  assert.equal(await future.send('a.userinfo <@2>'), 'success');
  assert.ok(field(future.messages.at(-1)?.payload.embeds?.[0], 'Silenciado até'));

  const past = bot({
    users: {
      async member() {
        return { ...glacial, timedOutUntil: Date.now() - 60_000 };
      },
    },
  });
  t.after(() => past.destroy());

  assert.equal(await past.send('a.userinfo <@2>'), 'success');
  assert.equal(field(past.messages.at(-1)?.payload.embeds?.[0], 'Silenciado até'), undefined);
});

test('guildinfo mostra as informações do servidor', async (t) => {
  const fixture = bot({
    users: {
      async guild() {
        return comunidade;
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.guildinfo'), 'success');
  const embed = fixture.messages.at(-1)?.payload.embeds?.[0];
  assert.equal(embed?.color, brand.primary);
  assert.equal(embed?.author?.name, 'Comunidade Fluxer');
  assert.equal(embed?.author?.iconURL, 'https://cdn.fluxer.app/icons/server.png');
  assert.equal(embed?.thumbnail?.url, 'https://cdn.fluxer.app/icons/server.png');
  assert.equal(field(embed, 'ID')?.value, '100');
  assert.equal(field(embed, 'Dono')?.value, '<@1>');
  assert.equal(field(embed, 'Membros')?.value, '**42**');
  assert.ok(field(embed, 'Criado em')?.value);
  assert.deepEqual(fixture.errors, []);
});

test('guildinfo avisa quando a guild falha', async (t) => {
  const fixture = bot({
    users: {
      async guild() {
        throw new Error('caiu');
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.guildinfo'), 'success');
  const content = fixture.messages.at(-1)?.payload.content ?? '';
  assert.match(content, /não consegui\*\* carregar as informações deste servidor/);
});
