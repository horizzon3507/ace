import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot } from 'yuzuha/testing';
import avatar from '../commands/avatar.js';
import userbanner from '../commands/userbanner.js';
import { emoji } from '../src/emoji.js';

test('avatar e userbanner funcionam em DM para o autor e por alias', async (t) => {
  const fixture = createTestBot({
    prefix: 'a.',
    commands: [avatar, userbanner],
    emoji,
    resources: {
      users: {
        async user(id: string) {
          return {
            id, username: 'ace', displayName: 'Ace', bot: false,
            avatarURL: `https://cdn.fluxer.app/avatars/${id}/pic.png`,
            bannerURL: `https://cdn.fluxer.app/banners/${id}/bnr.png`,
            createdTimestamp: 0,
          };
        },
        async bannerURL(id: string) {
          return `https://cdn.fluxer.app/banners/${id}/bnr.png?size=4096`;
        },
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.pfp', { guildID: '' }), 'success');
  assert.equal(fixture.messages.at(-1)?.payload.embeds?.[0]?.image?.url, 'https://cdn.fluxer.app/avatars/1/pic.png?size=4096');

  assert.equal(await fixture.send('a.ub', { guildID: '' }), 'success');
  assert.equal(fixture.messages.at(-1)?.payload.embeds?.[0]?.image?.url, 'https://cdn.fluxer.app/banners/1/bnr.png?size=4096');
});
