import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot, type MockResourceOverrides } from 'yuzuha/testing';
import autorole from '../commands/autorole.js';
import { bindGuildAutoroles, guildAutorole, setGuildAutoroleCache } from '../src/guild-autorole.js';
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

// Servidor com cargo do bot na posição 10, do autor na 9 e alvo na 5; dono é '2'.
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
    async resolve(_g: string, query: string) {
      if (query.replace(/<@&|>/g, '') === '42') return role('42', 5);
      throw new Error('nope');
    },
    async list() {
      return [role('8', 10), role('7', 9), role('42', 5)];
    },
  },
};

// O cache do módulo é compartilhado entre testes — limpa a entrada ao terminar.
function bot(resources?: MockResourceOverrides) {
  const fixture = createTestBot({ prefix: 'a.', commands: [autorole], emoji, resources });
  bindGuildAutoroles(fixture.store);
  return fixture;
}

test('a.autorole define o cargo, confirma e mostra a config atual', async (t) => {
  const fixture = bot(hierarchy);
  t.after(() => { setGuildAutoroleCache('100', undefined); return fixture.destroy(); });

  assert.equal(await fixture.send('a.autorole <@&42>'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /recebe \*\*cargo42\*\* automaticamente/);
  assert.equal(await fixture.store.read((state) => state.variables[VAR]), '42');
  assert.equal(await guildAutorole('100'), '42');

  await fixture.tick(3_100);
  assert.equal(await fixture.send('a.autorole'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /recebe <@&42> automaticamente/);
  assert.deepEqual(fixture.errors, []);
});

test('a.autorole sem cargo avisa que está desligado', async (t) => {
  const fixture = bot();
  t.after(() => { setGuildAutoroleCache('100', undefined); return fixture.destroy(); });

  assert.equal(await fixture.send('a.autorole'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /autorole está desligado/);
});

test('a.autorole off grava off e desliga a entrega', async (t) => {
  const fixture = bot(hierarchy);
  t.after(() => { setGuildAutoroleCache('100', undefined); return fixture.destroy(); });

  assert.equal(await fixture.send('a.autorole off'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /Autorole desligado/);
  assert.equal(await fixture.store.read((state) => state.variables[VAR]), 'off');
  assert.equal(await guildAutorole('100'), 'off');
});

test('cargo acima do bot ou do autor é recusado', async (t) => {
  const fixture = bot({
    users: hierarchy.users,
    roles: {
      async resolve() { return role('42', 12); },
      list: hierarchy.roles!.list,
    },
  });
  t.after(() => { setGuildAutoroleCache('100', undefined); return fixture.destroy(); });

  assert.equal(await fixture.send('a.autorole 42'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /acima do meu maior cargo/);

  const authorLower = bot({
    users: {
      ...hierarchy.users!,
      async member(_g: string, userID: string) {
        return member(userID, userID === '999' ? ['8'] : []);
      },
    },
    roles: {
      async resolve() { return role('42', 9); },
      list: hierarchy.roles!.list,
    },
  });
  t.after(() => { setGuildAutoroleCache('100', undefined); return authorLower.destroy(); });
  await authorLower.tick(3_100);
  assert.equal(await authorLower.send('a.autorole 42'), 'success');
  assert.match(authorLower.messages.at(-1)?.payload.content ?? '', /acima do seu maior cargo/);
});

test('cargo gerenciado ou desconhecido é recusado', async (t) => {
  const fixture = bot({
    roles: { async resolve() { return role('42', 5, { managed: true }); } },
  });
  t.after(() => { setGuildAutoroleCache('100', undefined); return fixture.destroy(); });

  assert.equal(await fixture.send('a.autorole 42'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não consigo entregar/);

  const missing = bot({
    roles: { async resolve() { throw new Error('nope'); } },
  });
  t.after(() => { setGuildAutoroleCache('100', undefined); return missing.destroy(); });
  await missing.tick(3_100);
  assert.equal(await missing.send('a.autorole 42'), 'success');
  assert.match(missing.messages.at(-1)?.payload.content ?? '', /não encontrei nenhum cargo/);
});
