import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot } from 'yuzuha/testing';
import ban from '../commands/ban.js';
import { emoji } from '../src/emoji.js';

test('ban funciona por alias e ID cru', async (t) => {
  const fixture = createTestBot({
    prefix: 'a.',
    commands: [ban],
    emoji,
    resources: {
      users: {
        async member(_g: string, id: string) {
          return {
            id, username: 'target', displayName: 'Target', bot: false,
            avatarURL: null, bannerURL: null, createdTimestamp: 0,
            nickname: null, joinedTimestamp: 0, roles: [], permissions: '0', timedOutUntil: null,
          };
        },
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.banir 2 spam pesado'), 'success');
  assert.equal(fixture.transport.actions.at(-1)?.action, 'ban');
  assert.equal(fixture.transport.actions.at(-1)?.targetID, '2');
  assert.equal(fixture.transport.actions.at(-1)?.reason, 'spam pesado');
});
