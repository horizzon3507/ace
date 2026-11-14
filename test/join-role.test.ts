import test from 'node:test';
import assert from 'node:assert/strict';
import { setGuildAutoroleCache } from '../src/guild-autorole.js';
import { grantJoinRole, joinRole, joinRoleFor } from '../src/join-role.js';

const member = (guildId: string, bot: boolean, roles: string[] = []) => ({
  guild: { id: guildId },
  user: { bot },
  roles: {
    has: (id: string) => roles.includes(id),
    add: async (id: string) => { roles.push(id); },
  },
});

test('joinRoleFor: configurado vence, off desliga e sem config cai no par fixo', async (t) => {
  t.after(() => { setGuildAutoroleCache('g1', undefined); setGuildAutoroleCache(joinRole.guildId, undefined); });
  setGuildAutoroleCache('g1', '42');
  assert.equal(await joinRoleFor('g1'), '42');
  setGuildAutoroleCache('g1', 'off');
  assert.equal(await joinRoleFor('g1'), undefined);
  assert.equal(await joinRoleFor(joinRole.guildId), joinRole.roleId);
  setGuildAutoroleCache(joinRole.guildId, 'off');
  assert.equal(await joinRoleFor(joinRole.guildId), undefined);
  assert.equal(await joinRoleFor('g2'), undefined);
});

test('grantJoinRole entrega o cargo configurado uma vez e ignora bot', async (t) => {
  t.after(() => setGuildAutoroleCache('g1', undefined));
  setGuildAutoroleCache('g1', '42');
  const roles: string[] = [];
  const human = member('g1', false, roles);
  assert.equal(await grantJoinRole(human), true);
  assert.deepEqual(roles, ['42']);
  assert.equal(await grantJoinRole(human), false);
  assert.equal(await grantJoinRole(member('g1', true)), false);
});

test('grantJoinRole no servidor original entrega o par fixo e respeita off', async (t) => {
  t.after(() => setGuildAutoroleCache(joinRole.guildId, undefined));
  const roles: string[] = [];
  const human = member(joinRole.guildId, false, roles);
  assert.equal(await grantJoinRole(human), true);
  assert.deepEqual(roles, [joinRole.roleId]);
  setGuildAutoroleCache(joinRole.guildId, 'off');
  assert.equal(await grantJoinRole(member(joinRole.guildId, false)), false);
});
