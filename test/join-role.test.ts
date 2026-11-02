import test from 'node:test';
import assert from 'node:assert/strict';
import { grantJoinRole, joinRole, shouldGrantJoinRole } from '../src/join-role.js';

test('cargo de entrada só vai para humano do servidor certo', () => {
  assert.equal(shouldGrantJoinRole({ guildId: joinRole.guildId, bot: false }), true);
  assert.equal(shouldGrantJoinRole({ guildId: joinRole.guildId, bot: true }), false);
  assert.equal(shouldGrantJoinRole({ guildId: '1', bot: false }), false);
});

test('grantJoinRole adiciona o cargo uma vez e ignora bot', async () => {
  const added: string[] = [];
  const human = {
    guild: { id: joinRole.guildId },
    user: { bot: false },
    roles: { has: (id: string) => added.includes(id), add: async (id: string) => { added.push(id); } },
  };
  assert.equal(await grantJoinRole(human), true);
  assert.deepEqual(added, [joinRole.roleId]);
  assert.equal(await grantJoinRole(human), false);
  assert.equal(await grantJoinRole({ ...human, user: { bot: true } }), false);
});
