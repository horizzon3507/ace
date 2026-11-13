import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot, type MockResourceOverrides } from 'yuzuha/testing';
import { brand } from '../src/brand.js';
import { emoji } from '../src/emoji.js';
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
  return createTestBot({ prefix: 'a.', commands, emoji, resources });
}

// Drena a cadeia de promises do paginador em background (tick só roda o scheduler).
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

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
  assert.equal(message?.content, '<:globefill:1566571242956263426> Pong! A minha conexão com este servidor está **incrível** (12ms)...');
});

test('ping sem amostra avisa em vez de inventar latência', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());
  fixture.transport.ping = -1;

  assert.equal(await fixture.send('a.ping'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /sem amostras de latência/);
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

test('ajuda pagina as categorias com uma página cada', async (t) => {
  const queue: string[] = [];
  const waiters: (() => void)[] = [];
  const push = (emoji: string) => { queue.push(emoji); waiters.shift()?.(); };
  const fixture = bot({
    collectors: {
      // awaitReaction espera o teste empurrar um clique, como o gateway faria.
      awaitReaction: async () => {
        while (queue.length === 0) await new Promise<void>((resolve) => waiters.push(resolve));
        return { userID: 'u1', emoji: queue.shift()!, messageID: '1' };
      },
    },
    messages: { removeReaction: async () => undefined, clearReactions: async () => undefined },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.ajuda'), 'success');
  const home = fixture.messages.at(-1)?.payload.embeds?.[0];
  assert.equal(home?.title, '<:home4fill:1570905409848344576> Ace');
  assert.match(home?.description ?? '', /Eu sou o \*\*Ace\*\*/);
  assert.equal(home?.footer?.text, 'Página 1 de 4 — Sobre mim');

  push('arrowrightfill'); // a seta avança (só próxima página)
  await flush();
  const page1 = fixture.messages.at(-1)?.payload.embeds?.[0];
  assert.equal(page1?.title, '<:userforbidfill:1566644852504932352> Moderação');
  assert.equal(page1?.description, undefined);
  assert.equal(page1?.footer?.text, 'Página 2 de 4 — Confira meus comandos');

  push('arrowrightfill');
  await flush();
  const page2 = fixture.messages.at(-1)?.payload.embeds?.[0];
  assert.equal(page2?.title, '<:information2fill:1566640356991184896> Informações');
  assert.equal(page2?.description, undefined);
  assert.equal(page2?.footer?.text, 'Página 3 de 4 — Confira meus comandos');

  push('arrowrightfill');
  await flush();
  const page3 = fixture.messages.at(-1)?.payload.embeds?.[0];
  assert.equal(page3?.title, '<:globefill:1566571242956263426> Utilidades');
  assert.equal(page3?.footer?.text, 'Página 4 de 4 — Confira meus comandos');

  push('home4fill'); // home leva de volta à página sobre o bot
  await flush();
  const backHome = fixture.messages.at(-1)?.payload.embeds?.[0];
  assert.equal(backHome?.footer?.text, 'Página 1 de 4 — Sobre mim');

  const listed = [page1, page2, page3].flatMap((page) =>
    (page?.fields ?? []).map((field) => /`a\.(\w+)`$/.exec(field.name)?.[1] ?? ''));
  for (const command of fixture.bot.listCommands().filter((item) => !item.hidden)) {
    const count = listed.filter((name) => name === command.name).length;
    assert.equal(count, 1, `ajuda listou ${command.name} ${count}x`);
  }
  for (const field of [page1, page2, page3].flatMap((page) => page?.fields ?? [])) {
    assert.equal(field.inline, true);
    assert.ok(field.value, 'ajuda listou comando sem descrição');
  }
  const reacted = fixture.transport.reactions.map((reaction) => reaction.emoji);
  assert.ok(reacted.includes('<:arrowrightfill:1566639126151700482>'));
  assert.ok(reacted.includes('<:home4fill:1570905409848344576>'));
  assert.doesNotMatch(listed.join(' '), /hello/);
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
  assert.match(content, /-# ╰ Motivo: spam \| ID: 2$/);
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
  assert.match(content, /-# ╰ Motivo: spam \| ID: 2$/);
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
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Por favor, me informe o usuário por menção/);
});

test('userbanner exibe o banner do perfil', async (t) => {
  const fixture = bot({
    users: {
      async member(_guildID: string, userID: string) {
        return animatedMember(userID);
      },
      // O recurso resolve o perfil por dentro e já devolve a URL animada final.
      async bannerURL() {
        return 'https://fluxerusercontent.com/banners/1/a_b456.gif?size=4096';
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.userbanner'), 'success');
  const embed = fixture.messages.at(-1)?.payload.embeds?.[0];
  assert.equal(embed?.image?.url, 'https://fluxerusercontent.com/banners/1/a_b456.gif?size=4096');
  assert.equal(embed?.author?.name, 'Banner de Glacial');
});

test('userbanner avisa quando falta banner', async (t) => {
  const fixture = bot({
    users: {
      async member(_guildID: string, userID: string) {
        return animatedMember(userID);
      },
      async bannerURL() {
        return null;
      },
      async user(id: string) {
        return { ...animatedMember(id), bannerURL: null };
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.userbanner'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não possui um banner configurado/);
});
