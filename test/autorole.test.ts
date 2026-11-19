import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot, type MockResourceOverrides } from 'yuzuha/testing';
import autorole from '../commands/autorole.js';
import { bindGuildAutoroles, clearGuildAutoroleCache, guildAutorole, setGuildAutoroleCache } from '../src/guild-autorole.js';
import { emoji } from '../src/emoji.js';

const VAR = JSON.stringify(['guild', '100', 'autorole']);

const role = (id: string, position: number, extra = {}) => ({
  id, name: `cargo${id}`, color: 0, position, permissions: '0',
  hoist: false, mentionable: false, unicodeEmoji: null, managed: false, ...extra,
});
const member = (id: string, roles: string[], permissions = '0') => ({
  id, username: `u${id}`, displayName: `U${id}`, bot: false,
  avatarURL: null, bannerURL: null, createdTimestamp: 0,
  nickname: null, joinedTimestamp: 0, roles, permissions, timedOutUntil: null,
});

const resolve = (positions: Record<string, number>, extra: Record<string, object> = {}) =>
  async (_g: string, query: string) => {
    const id = query.replace(/<@&|>/g, '');
    if (id in positions) return role(id, positions[id], extra[id] ?? {});
    throw new Error('nope');
  };

// Servidor com cargo do bot na posição 10, do autor na 9 e alvos baixos; dono é '2'.
const hierarchy: MockResourceOverrides = {
  users: {
    async guild() {
      return { id: '100', name: 'S', ownerID: '2', iconURL: null, bannerURL: null, memberCount: 3, createdTimestamp: 0 };
    },
    async member(_g: string, userID: string) {
      return member(userID, userID === '999' ? ['8'] : ['7']);
    },
  },
  roles: {
    resolve: resolve({ '42': 5, '43': 4 }),
    async list() {
      return [role('8', 10), role('7', 9), role('42', 5), role('43', 4)];
    },
  },
};

// O cache do módulo é compartilhado entre testes — limpa a entrada ao terminar.
function bot(resources?: MockResourceOverrides) {
  const fixture = createTestBot({ prefix: 'a.', commands: [autorole], emoji, resources });
  bindGuildAutoroles(fixture.store);
  return fixture;
}
const clean = (fixture: { destroy(): Promise<unknown> | unknown }) =>
  () => { setGuildAutoroleCache('100', undefined); return fixture.destroy(); };

test('a.autorole lista as três categorias', async (t) => {
  const fixture = bot();
  t.after(clean(fixture));

  assert.equal(await fixture.send('a.autorole'), 'success');
  const content = fixture.messages.at(-1)?.payload.content ?? '';
  assert.match(content, /\*\*Todos\*\*: desligado/);
  assert.match(content, /\*\*Usuários\*\*: desligado/);
  assert.match(content, /\*\*Apps\*\*: desligado/);
  assert.match(content, /`a\.autorole reset <categoria>`/);
});

test('a.autorole user grava vários cargos e a categoria aparece configurada', async (t) => {
  const fixture = bot(hierarchy);
  t.after(clean(fixture));

  assert.equal(await fixture.send('a.autorole user <@&42> <@&43>'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /\*\*Usuários\*\* configurado: <@&42> <@&43>/);
  assert.deepEqual(await fixture.store.read((state) => state.variables[VAR]), { user: ['42', '43'] });
  assert.deepEqual(await guildAutorole('100'), { user: ['42', '43'] });

  await fixture.tick(3_100);
  assert.equal(await fixture.send('a.autorole'), 'success');
  const content = fixture.messages.at(-1)?.payload.content ?? '';
  assert.match(content, /\*\*Todos\*\*: desligado/);
  assert.match(content, /\*\*Usuários\*\*: <@&42> <@&43>/);
  assert.match(content, /\*\*Apps\*\*: desligado/);
  assert.deepEqual(fixture.errors, []);
});

test('a.autorole <categoria> mostra só ela e reset a desliga', async (t) => {
  const fixture = bot(hierarchy);
  t.after(clean(fixture));

  assert.equal(await fixture.send('a.autorole app <@&42>'), 'success');
  await fixture.tick(3_100);
  assert.equal(await fixture.send('a.autorole app'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /\*\*Apps\*\*: <@&42>/);

  await fixture.tick(3_100);
  assert.equal(await fixture.send('a.autorole reset app'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /\*\*Apps\*\* desligado/);
  assert.deepEqual(await fixture.store.read((state) => state.variables[VAR]), { app: 'off' });
  assert.deepEqual(await guildAutorole('100'), { app: 'off' });
});

test('sem categoria ou categoria inválida pede all, user ou app', async (t) => {
  const fixture = bot();
  t.after(clean(fixture));

  assert.equal(await fixture.send('a.autorole 42'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /`all` \(todos\), `user` \(usuários\) ou `app` \(bots\)/);
  await fixture.tick(3_100);
  assert.equal(await fixture.send('a.autorole reset nada'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /categoria a limpar/);
});

test('a.autorole off puro desliga as três categorias', async (t) => {
  const fixture = bot(hierarchy);
  t.after(clean(fixture));

  assert.equal(await fixture.send('a.autorole app <@&42>'), 'success');
  await fixture.tick(3_100);
  assert.equal(await fixture.send('a.autorole off'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /desligado por completo/);
  assert.deepEqual(await fixture.store.read((state) => state.variables[VAR]), { all: 'off', user: 'off', app: 'off' });
  assert.deepEqual(await guildAutorole('100'), { all: 'off', user: 'off', app: 'off' });
});

test('mais de 15 cargos, gerenciado e desconhecido são recusados', async (t) => {
  const fixture = bot({
    users: hierarchy.users,
    roles: { resolve: resolve({ '42': 5, '43': 5 }, { '43': { managed: true } }), list: hierarchy.roles!.list },
  });
  t.after(clean(fixture));

  assert.equal(await fixture.send(`a.autorole user ${'x '.repeat(16)}`), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /até 15 cargos/);

  await fixture.tick(3_100);
  assert.equal(await fixture.send('a.autorole user <@&43>'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não consigo entregar/);

  await fixture.tick(3_100);
  assert.equal(await fixture.send('a.autorole user <@&99>'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não encontrei nenhum cargo como <@&99>/);
});

test('cargo acima do bot ou do autor é recusado', async (t) => {
  const fixture = bot({ users: hierarchy.users, roles: { resolve: resolve({ '42': 12 }), list: hierarchy.roles!.list } });
  t.after(clean(fixture));

  assert.equal(await fixture.send('a.autorole all 42'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /acima do meu maior cargo/);

  const authorLower = bot({
    users: {
      ...hierarchy.users!,
      async member(_g: string, userID: string) {
        return member(userID, userID === '999' ? ['8'] : []);
      },
    },
    roles: { resolve: resolve({ '42': 9 }), list: hierarchy.roles!.list },
  });
  t.after(clean(authorLower));
  await authorLower.tick(3_100);
  assert.equal(await authorLower.send('a.autorole all 42'), 'success');
  assert.match(authorLower.messages.at(-1)?.payload.content ?? '', /acima do seu maior cargo/);
});


test('tokens repetidos deduplicam resolucao e clearGuildAutoroleCache limpa memoria', async (t) => {
  let resolveCalls = 0;
  const fixture = bot({
    users: hierarchy.users,
    roles: {
      resolve: async (g: string, q: string) => {
        resolveCalls += 1;
        return resolve({ '42': 5 })(g, q);
      },
      list: hierarchy.roles!.list,
    },
  });
  t.after(() => { clearGuildAutoroleCache(); return fixture.destroy(); });

  assert.equal(await fixture.send('a.autorole user <@&42> <@&42>'), 'success');
  assert.equal(resolveCalls, 1);
  assert.deepEqual(await guildAutorole('100'), { user: ['42'] });
  clearGuildAutoroleCache();
});
