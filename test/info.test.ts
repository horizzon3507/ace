import test from 'node:test';
import assert from 'node:assert/strict';
import type { Embed } from 'yuzuha';
import { SDK } from 'yuzuha';
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

const fieldValue = (embed: Embed | undefined, name: string) =>
  embed?.fields?.find((field) => field.name.includes(name))?.value ?? '';

function assertUserInfoEmbed(embed: Embed | undefined) {
  assert.equal(embed?.color, brand.background);
  assert.equal(embed?.author?.name, 'Informações de Glacial');
  assert.match(fieldValue(embed, 'Ficha'), /Este usuário é <@2>, de nome de usuário `glacial` e ID `2`!/);
  assert.match(fieldValue(embed, 'Ficha'), /Seu apelido neste servidor é \*\*Glacial\*\*!/);
  assert.match(fieldValue(embed, 'Criada em'), /A conta deste usuário foi criada em \*\*\d{2}\/\d{2}\/\d{4} \*\*às/);
  assert.match(fieldValue(embed, 'Entrada'), /Este membro entrou neste servidor em \*\*\d{2}\/\d{2}\/\d{4}/);
  assert.match(fieldValue(embed, 'Hierarquia'), /Este membro possui \*\*2\*\* cargos!/);
  assert.equal(fieldValue(embed, 'Situação'), '');
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
  assert.equal(embed?.author?.name, 'Informações de Glacial');
  const names = (embed?.fields ?? []).map((field) => field.name).join(' ');
  assert.equal(fieldValue(embed, 'Criada em') !== '', true);
  assert.doesNotMatch(names, /Entrada|Hierarquia|Situação/);
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
  assert.match(fieldValue(future.messages.at(-1)?.payload.embeds?.[0], 'Situação'), /Este membro está silenciado até/);

  const past = bot({
    users: {
      async member() {
        return { ...glacial, timedOutUntil: Date.now() - 60_000 };
      },
    },
  });
  t.after(() => past.destroy());

  assert.equal(await past.send('a.userinfo <@2>'), 'success');
  assert.equal(fieldValue(past.messages.at(-1)?.payload.embeds?.[0], 'Situação'), '');
});

test('userinfo mostra cargo mais alto e maior privilégio do membro', async (t) => {
  const fixture = bot({
    users: {
      async member() {
        return { ...glacial, permissions: String(SDK.PermissionFlags.Administrator) };
      },
    },
    roles: {
      async list() {
        return [role('100', 0), role('50', 9), role('60', 1)];
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.userinfo <@2>'), 'success');
  const embed = fixture.messages.at(-1)?.payload.embeds?.[0];
  const hierarquia = fieldValue(embed, 'Hierarquia');
  assert.match(hierarquia, /Este membro possui \*\*2\*\* cargos!/);
  assert.match(hierarquia, /Seu maior privilégio é \*\*Administrador\*\*!/);
  assert.equal(fieldValue(embed, 'Cargos'), 'Seu cargo mais alto é **<@&50>** e o mais baixo é **<@&60>**!');
  assert.deepEqual(fixture.errors, []);
});

test('userinfo mostra bio, pronomes e conexões do perfil', async (t) => {
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
            pronouns: 'ele/dele', bio: 'dev do ace', banner: null, bannerURL: null,
            accentColor: 0xff00ff, bannerColor: null, theme: null,
            mutualGuildIDs: ['100', '200'],
            connectedAccounts: [{ name: 'horizzon3507', type: 'github' }],
          },
          serverProfile: null,
        };
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.userinfo <@2>'), 'success');
  const embed = fixture.messages.at(-1)?.payload.embeds?.[0];
  assert.equal(embed?.color, 0xff00ff);
  assert.equal(fieldValue(embed, 'Pronomes'), 'Seus pronomes são "**ele/dele**". Incrível, não é?');
  assert.match(fieldValue(embed, 'Ficha'), /divide \*\*2\*\* servidores comigo!/);
  assert.match(fieldValue(embed, 'Conexões'), /conectou `horizzon3507`!/);
  const bio = embed?.fields?.at(-1);
  assert.equal(bio?.name.includes('Bio'), true);
  assert.equal(bio?.inline, false);
  assert.equal(bio?.value, 'dev do ace');
  assert.deepEqual(fixture.errors, []);
});

const role = (id: string, position: number) => ({
  id, name: id, color: 0, position, permissions: '0',
  hoist: false, mentionable: false, unicodeEmoji: null, managed: false,
});

const chan = (id: string, type: number) => ({
  id, name: id, type, guildID: '100', parentID: null, position: 0,
  topic: null, slowmode: 0, nsfw: false,
});

test('guildinfo mostra a ficha do servidor em campos', async (t) => {
  const fixture = bot({
    users: {
      async guild() {
        return { ...comunidade, memberCount: 3, features: ['ANIMATED_ICON', 'BANNER', 'MODO_SECRETO'] };
      },
      async guildCounts() {
        return { guildID: '100', memberCount: 3, onlineCount: 2 };
      },
      async members() {
        return [
          { ...glacial, id: '1', bot: false },
          { ...glacial, id: '2', bot: false },
          { ...glacial, id: '9', bot: true },
        ];
      },
      async me() {
        // SendMessages + ManageMessages + BanMembers — mistura de ✓ e ✗ no diagnóstico.
        return { ...glacial, id: '999', permissions: String(SDK.PermissionFlags.SendMessages | SDK.PermissionFlags.ManageMessages | SDK.PermissionFlags.BanMembers) };
      },
      async user() {
        return { id: '1', username: 'gabriel', displayName: 'Gabriel', bot: false, avatarURL: null, bannerURL: null, createdTimestamp: 0 };
      },
    },
    roles: {
      async list() {
        return [role('100', 0), role('50', 9), role('60', 1)];
      },
    },
    channels: {
      async list() {
        return [chan('t1', 0), chan('t2', 0), chan('v1', 2), chan('c1', 4)];
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.guildinfo'), 'success');
  const embed = fixture.messages.at(-1)?.payload.embeds?.[0];
  assert.equal(embed?.color, brand.background);
  assert.equal(embed?.author?.name, 'Informações de Comunidade Fluxer');
  assert.equal(embed?.author?.iconURL, 'https://cdn.fluxer.app/icons/server.png');
  assert.equal(embed?.thumbnail?.url, 'https://cdn.fluxer.app/icons/server.png?size=1024');

  const fields = embed?.fields ?? [];
  const byName = (name: string) => fields.find((field) => field.name.includes(name))?.value ?? '';
  assert.match(byName('Ficha'), /O detentor\(a\) deste servidor é <@1>, de nome de usuário `gabriel` e ID `1`!/);
  assert.match(byName('Criado em'), /Este servidor foi criado em \*\*\d{2}\/\d{2}\/\d{4} \*\*às \*\*\d{2}:\d{2}\*\*, há \*\*\d+ anos\*\*!/);
  assert.match(byName('Usuários'), /Há \*\*3\*\* usuários, sendo \*\*2\*\* humanos e \*\*1\*\* aplicativo\. Temos \*\*2\*\* usuários online!/);
  assert.match(byName('Cargos'), /Este servidor possui \*\*3\*\* cargos, sendo o que está no topo \*\*<@&50>\*\* e o que está na base \*\*<@&60>\*\*!/);
  assert.match(byName('Canais'), /Há \*\*4\*\* canais, sendo deles \*\*2\*\* canais de texto, \*\*1\*\* canal de voz e \*\*1\*\* categoria!/);
  const recursos = fields.find((field) => field.name.includes('Recursos'));
  assert.equal(recursos?.inline, true);
  assert.equal(recursos?.value, 'ícone animado, banner, `MODO_SECRETO`');

  const diagnostico = fields.at(-1);
  assert.equal(diagnostico?.name.includes('Diagnóstico'), true);
  assert.equal(diagnostico?.inline, false);
  assert.equal(
    diagnostico?.value,
    'Eu ainda necessito das permissões **gerenciar cargos**, **gerenciar servidor**, **expulsar membros** e **moderar membros** para garantir o meu funcionamento estável!',
  );
  assert.deepEqual(fixture.errors, []);
});

test('guildinfo sem contadores ainda responde a ficha', async (t) => {
  const fixture = bot({
    users: {
      async guild() {
        return comunidade;
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.guildinfo'), 'success');
  const fields = fixture.messages.at(-1)?.payload.embeds?.[0]?.fields ?? [];
  assert.equal(fields.length, 3); // Ficha + Criado em + Usuários (só total)
  assert.match(fields.find((field) => field.name.includes('Usuários'))?.value ?? '', /Há \*\*42\*\* usuários!/);
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
