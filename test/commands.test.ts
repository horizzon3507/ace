import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot, type MockResourceOverrides } from 'yuzuha/testing';
import { brand } from '../src/brand.js';
import { prefix } from '../src/prefix.js';
import ping from '../commands/ping.js';
import uptime from '../commands/uptime.js';
import setprefix from '../commands/setprefix.js';
import ajuda from '../commands/ajuda.js';
import guildicon from '../commands/guildicon.js';
import avatar from '../commands/avatar.js';
import userbanner from '../commands/userbanner.js';
import guildbanner from '../commands/guildbanner.js';
import kick from '../commands/kick.js';
import ban from '../commands/ban.js';
import userinfo from '../commands/userinfo.js';
import guildinfo from '../commands/guildinfo.js';
import clear from '../commands/clear.js';
import purge from '../commands/purge.js';
import timeout from '../commands/timeout.js';
import unban from '../commands/unban.js';

const commands = [ping, uptime, setprefix, ajuda, guildicon, avatar, userbanner, guildbanner, kick, ban, userinfo, guildinfo, clear, purge, timeout, unban];

function bot(resources?: MockResourceOverrides) {
  return createTestBot({ prefix: 'a.', commands, resources });
}

test('PREFIX define o prefixo e cai em a. quando falta', (t) => {
  const previous = process.env.PREFIX;
  t.after(() => { previous === undefined ? delete process.env.PREFIX : process.env.PREFIX = previous; });
  delete process.env.PREFIX;
  assert.equal(prefix(), 'a.');
  process.env.PREFIX = '  zz.  ';
  assert.equal(prefix(), 'zz.');
  process.env.PREFIX = '   ';
  assert.equal(prefix(), 'a.');
  process.env.PREFIX = 'a b';
  assert.equal(prefix(), 'a.');
});

test('ping responde a latência', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.ping'), 'success');
  const message = fixture.messages.at(-1)?.payload;
  assert.equal(message?.embeds, undefined);
  assert.equal(message?.content, '<:globefill:1566571242956263426> Pong! A minha conexão com este servidor está **incrível** (12ms).');
});

test('ping sem amostra avisa em vez de inventar latência', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());
  fixture.transport.ping = -1;

  assert.equal(await fixture.send('a.ping'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Ainda sem amostra de latência/);
});

test('ping degrada a qualificação conforme a latência sobe', async (t) => {
  for (const [ping, status] of [[40, 'incrível'], [100, 'normal'], [200, 'razoável'], [400, 'péssima']] as const) {
    const fixture = bot();
    t.after(() => fixture.destroy());
    fixture.transport.ping = ping;
    assert.equal(await fixture.send('a.ping'), 'success');
    assert.match(fixture.messages.at(-1)?.payload.content ?? '', new RegExp(`está \\*\\*${status}\\*\\* \\(${ping}ms\\)`));
  }
});

test('mensagem sem o prefixo é ignorada', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('!ping'), 'ignored');
  assert.equal(fixture.messages.length, 0);
});

test('ajuda lista os comandos por categoria em grade', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.ajuda'), 'success');
  const embed = fixture.messages.at(-1)?.payload.embeds?.[0];
  assert.equal(embed?.title, '<:commandline:1567301268425146368> Confira meus comandos');
  assert.equal(embed?.description, 'Heey! Estes são os **meus comandos**. Não é uma lista infinita, é **uma lista útil**.');
  assert.equal(embed?.footer, undefined);
  const fields = embed?.fields ?? [];
  for (const command of fixture.bot.listCommands().filter((item) => !item.hidden)) {
    const field = fields.find((item) => item.name.endsWith(` \`a.${command.name}\``));
    assert.ok(field, `ajuda não listou ${command.name}`);
    assert.equal(field.inline, true);
    assert.ok(field.value, `ajuda listou ${command.name} sem descrição`);
  }
  const icons = Object.fromEntries(fields.map((item) => [item.name.split(' `')[0], item.name]));
  assert.deepEqual(Object.keys(icons).sort(), [
    '<:globefill:1566571242956263426>',
    '<:information2fill:1566640356991184896>',
    '<:userforbidfill:1566644852504932352>',
  ]);
  assert.match(fields.find((item) => item.name.endsWith('`a.setprefix`'))?.name ?? '', /^<:information2fill/);
  assert.doesNotMatch(fields.map((item) => item.name).join(' '), /hello/);
  assert.deepEqual(fixture.errors, []);
});

test('guildicon exibe o ícone do servidor', async (t) => {
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

  assert.equal(await fixture.send('a.guildicon'), 'success');
  const embed = fixture.messages.at(-1)?.payload.embeds?.[0];
  assert.equal(embed?.color, brand.primary);
  assert.equal(embed?.author?.name, 'Ícone de Comunidade Fluxer');
  assert.equal(embed?.author?.iconURL, 'https://cdn.fluxer.app/icons/server.png');
  assert.equal(embed?.image?.url, 'https://cdn.fluxer.app/icons/server.png?size=4096');
});

test('guildavatar segue como alias de guildicon', async (t) => {
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

test('guildbanner exibe o banner sem ícone no author', async (t) => {
  const fixture = bot({
    users: {
      async guild(guildID: string) {
        return {
          id: guildID,
          name: 'Comunidade Fluxer',
          ownerID: '1',
          iconURL: 'https://cdn.fluxer.app/icons/server.png',
          bannerURL: 'https://cdn.fluxer.app/banners/server.png',
          memberCount: 5,
          createdTimestamp: 0,
        };
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.guildbanner'), 'success');
  const embed = fixture.messages.at(-1)?.payload.embeds?.[0];
  assert.equal(embed?.author?.name, 'Banner de Comunidade Fluxer');
  assert.equal(embed?.author?.iconURL, undefined);
  assert.equal(embed?.image?.url, 'https://cdn.fluxer.app/banners/server.png?size=4096');
});

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
  roles: [] as string[],
  permissions: '0',
  timedOutUntil: null,
};

test('kick expulsa por menção e mostra motivo e ID', async (t) => {
  const fixture = bot({
    users: {
      async member() {
        return glacial;
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.kick <@2> spam'), 'success');
  const content = fixture.messages.at(-1)?.payload.content ?? '';
  assert.match(content, /<:logoutboxfill:1566645144776605696> \*\*Glacial\*\* foi expulso do servidor\./);
  assert.match(content, /-# ╰ Motivo: spam \| ID: 2 \| Caso #1/);
  assert.equal(fixture.transport.actions.at(-1)?.action, 'kick');
  assert.equal(fixture.transport.actions.at(-1)?.targetID, '2');
});

test('ban resolve glacial#0001 e mostra motivo e ID', async (t) => {
  const fixture = bot({
    users: {
      async searchMembers() {
        return {
          members: [{ userID: '2', username: 'glacial', displayName: 'Glacial', nickname: null }],
          total: 1,
          hasMore: false,
          indexing: false,
        };
      },
      async member() {
        return glacial;
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.ban glacial#0001 spam'), 'success');
  const content = fixture.messages.at(-1)?.payload.content ?? '';
  assert.match(content, /<:userforbidfill:1566644852504932352> \*\*Glacial\*\* foi banido do servidor\./);
  assert.match(content, /-# ╰ Motivo: spam \| ID: 2 \| Caso #1/);
  assert.equal(fixture.transport.actions.at(-1)?.action, 'ban');
  assert.equal(fixture.transport.actions.at(-1)?.targetID, '2');
  assert.equal(fixture.transport.actions.at(-1)?.reason, 'spam');
});

const animatedMember = (id: string) => ({
  id,
  username: 'glacial',
  displayName: 'Glacial',
  bot: false,
  avatarURL: `https://cdn.fluxer.app/avatars/${id}/a_ab12.png?size=1024`,
  bannerURL: null,
  createdTimestamp: 0,
  nickname: 'Glacial',
  joinedTimestamp: 0,
  roles: [] as string[],
  permissions: '0',
  timedOutUntil: null,
});

test('avatar sem argumento mostra o autor e anima asset a_', async (t) => {
  const fixture = bot({
    users: {
      async member(_guildID: string, userID: string) {
        return animatedMember(userID);
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.avatar'), 'success');
  const embed = fixture.messages.at(-1)?.payload.embeds?.[0];
  assert.equal(embed?.image?.url, 'https://cdn.fluxer.app/avatars/1/a_ab12.gif?size=4096');
  assert.equal(embed?.author?.name, 'Avatar de Glacial');
  assert.equal(embed?.thumbnail, undefined);
  assert.deepEqual(fixture.errors, []);
});

test('avatar resolve membro por nome no servidor', async (t) => {
  const fixture = bot({
    users: {
      async searchMembers() {
        return {
          members: [{ userID: '2', username: 'glacial', displayName: 'Glacial', nickname: null }],
          total: 1,
          hasMore: false,
          indexing: false,
        };
      },
      async member(_guildID: string, userID: string) {
        return animatedMember(userID);
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.avatar glacial'), 'success');
  const embed = fixture.messages.at(-1)?.payload.embeds?.[0];
  assert.equal(embed?.image?.url, 'https://cdn.fluxer.app/avatars/2/a_ab12.gif?size=4096');
});

test('avatar avisa quando falta imagem', async (t) => {
  const fixture = bot({
    users: {
      async member(_guildID: string, userID: string) {
        return { ...animatedMember(userID), avatarURL: null };
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.avatar'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não possui um avatar configurado/);
});

test('avatar na DM pede menção ou ID', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.avatar alguém', { guildID: '' }), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Por favor, informe o usuário por menção/);
});

test('userbanner avisa quando falta banner', async (t) => {
  const fixture = bot({
    users: {
      async member(_guildID: string, userID: string) {
        return { ...animatedMember(userID), bannerURL: null };
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.userbanner'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não possui um banner configurado/);
});
