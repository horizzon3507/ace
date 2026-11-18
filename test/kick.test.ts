import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot } from 'yuzuha/testing';
import kick from '../commands/kick.js';
import { emoji } from '../src/emoji.js';

test('kick funciona via alias e exige servidor', async (t) => {
  const fixture = createTestBot({
    prefix: 'a.',
    commands: [kick],
    emoji,
    resources: {
      users: {
        async member(_g: string, id: string) {
          return {
            id, username: `u${id}`, displayName: `U${id}`, bot: false,
            avatarURL: null, bannerURL: null, createdTimestamp: 0,
            nickname: null, joinedTimestamp: 0, roles: [], permissions: '0', timedOutUntil: null,
          };
        },
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.expulsar <@2> bagunca'), 'success');
  assert.equal(fixture.transport.actions.at(-1)?.action, 'kick');
  assert.equal(fixture.transport.actions.at(-1)?.reason, 'bagunca');

  fixture.clock.advance(4_000);
  assert.equal(await fixture.send('a.kick <@2>', { guildID: '' }), 'guarded');
});
