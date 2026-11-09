import test from 'node:test';
import assert from 'node:assert/strict';
import type { Embed } from 'yuzuha';
import { createTestBot, type MockResourceOverrides } from 'yuzuha/testing';
import { emoji } from '../src/emoji.js';
import { brand } from '../src/brand.js';
import userinfo from '../commands/userinfo.js';
import guildinfo from '../commands/guildinfo.js';

const commands = [userinfo, guildinfo];

function bot(resources?: MockResourceOverrides) {
  return createTestBot({ prefix: 'a.', commands, emoji, resources });
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
  assert.equal(embed?.color, brand.background);
  assert.equal(embed?.author?.name, 'Glacial');
  const description = embed?.description ?? '';
  assert.match(description, /\*\*@glacial\*\* `2`/);
  assert.match(description, /Apelido \*\*Glacial\*\*/);
  assert.match(description, /Entrou /);
  assert.match(description, /Conta de /);
  assert.match(description, /Cargos: <@&50> <@&60>/);
  assert.doesNotMatch(description, /Silenciado até/);
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

test('userinfo mostra o banner do perfil como imagem', async (t) => {
  const fixture = bot({
    users: {
      async member() {
        return glacial;
      },
      async profile() {
        return {
          user: glacial,
          member: glacial,
          globalProfile: {
            // 0.3.x: o perfil já traz bannerURL resolvido (a_ → .gif incluso).
            pronouns: null, bio: null, banner: null, bannerURL: 'https://fluxerusercontent.com/banners/2/a_b456.gif',
            accentColor: null, bannerColor: null, theme: null, mutualGuildIDs: [], connectedAccounts: [],
          },
          serverProfile: null,
        };
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.userinfo <@2>'), 'success');
  const embed = fixture.messages.at(-1)?.payload.embeds?.[0];
  assert.equal(embed?.image?.url, 'https://fluxerusercontent.com/banners/2/a_b456.gif?size=4096');
  assert.deepEqual(fixture.errors, []);
});

test('userinfo cai para o usuário global quando o membro falha', async (t) => {
  const fixture = bot({
    users: {
      async member() {
        // 404 → resolve nativo missing → ID segue found → member falha de novo e cai pro user.
        throw Object.assign(new Error('fora do servidor'), { status: 404 });
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
  const description = embed?.description ?? '';
  assert.match(description, /Conta de /);
  assert.doesNotMatch(description, /Entrou /);
  assert.doesNotMatch(description, /Apelido/);
  assert.doesNotMatch(description, /Cargos/);
  assert.deepEqual(fixture.errors, []);
});

test('userinfo avisa quando membro e usuário falham', async (t) => {
  const fixture = bot({
    users: {
      async member() {
        throw Object.assign(new Error('fora do servidor'), { status: 404 });
      },
      async user() {
        throw new Error('não existe');
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.userinfo <@2>'), 'success');
  const content = fixture.messages.at(-1)?.payload.content ?? '';
  assert.match(content, /não consegui carregar as informações deste usuário/);
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
  assert.match(future.messages.at(-1)?.payload.embeds?.[0]?.description ?? '', /Silenciado até/);

  const past = bot({
    users: {
      async member() {
        return { ...glacial, timedOutUntil: Date.now() - 60_000 };
      },
    },
  });
  t.after(() => past.destroy());

  assert.equal(await past.send('a.userinfo <@2>'), 'success');
  assert.doesNotMatch(past.messages.at(-1)?.payload.embeds?.[0]?.description ?? '', /Silenciado até/);
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
  assert.equal(embed?.color, brand.background);
  assert.equal(embed?.author?.name, 'Comunidade Fluxer');
  assert.equal(embed?.author?.iconURL, 'https://cdn.fluxer.app/icons/server.png');
  assert.equal(embed?.thumbnail?.url, 'https://cdn.fluxer.app/icons/server.png');
  const description = embed?.description ?? '';
  assert.match(description, /`100`/);
  assert.match(description, /Dono <@1> · \*\*42\*\* membros/);
  assert.match(description, /Criado em /);
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
  assert.match(content, /não consegui carregar as informações deste servidor/);
});
