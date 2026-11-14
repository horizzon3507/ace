import test from 'node:test';
import assert from 'node:assert/strict';
import { setGuildAutoroleCache } from '../src/guild-autorole.js';
import { grantJoinRole, joinRole, joinRolesFor } from '../src/join-role.js';

const member = (guildId: string, bot: boolean, roles: string[] = []) => ({
  guild: { id: guildId },
  user: { bot },
  roles: {
    has: (id: string) => roles.includes(id),
    add: async (id: string) => { roles.push(id); },
  },
});

test('joinRolesFor mistura all com a categoria do tipo de conta', async (t) => {
  t.after(() => { setGuildAutoroleCache('g1', undefined); setGuildAutoroleCache('g2', undefined); });
  setGuildAutoroleCache('g1', { all: ['1'], user: ['2'], app: ['3'] });
  assert.deepEqual(await joinRolesFor('g1', false), ['1', '2']);
  assert.deepEqual(await joinRolesFor('g1', true), ['1', '3']);
  setGuildAutoroleCache('g2', { user: ['2'], app: ['3'] });
  assert.deepEqual(await joinRolesFor('g2', false), ['2']);
  setGuildAutoroleCache('g2', { all: 'off', user: ['2'] });
  assert.deepEqual(await joinRolesFor('g2', false), ['2']);
});

test('joinRolesFor sem config cai no par fixo do servidor original', async (t) => {
  t.after(() => setGuildAutoroleCache(joinRole.guildId, undefined));
  assert.deepEqual(await joinRolesFor(joinRole.guildId, false), [joinRole.roleId]);
  assert.deepEqual(await joinRolesFor(joinRole.guildId, true), [joinRole.roleId]);
  setGuildAutoroleCache(joinRole.guildId, { all: 'off' });
  assert.deepEqual(await joinRolesFor(joinRole.guildId, false), []);
  assert.deepEqual(await joinRolesFor('g2', false), []);
});

test('grantJoinRole entrega os cargos que faltam uma vez e ignora bot sem app', async (t) => {
  t.after(() => setGuildAutoroleCache('g1', undefined));
  setGuildAutoroleCache('g1', { all: ['1'], user: ['2', '3'], app: ['4'] });
  const roles: string[] = ['2'];
  const human = member('g1', false, roles);
  assert.equal(await grantJoinRole(human), true);
  assert.deepEqual(roles, ['2', '1', '3']);
  assert.equal(await grantJoinRole(human), false);
  const appRoles: string[] = [];
  const bot = member('g1', true, appRoles);
  assert.equal(await grantJoinRole(bot), true);
  assert.deepEqual(appRoles, ['1', '4']);
});
