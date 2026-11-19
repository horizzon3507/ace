import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot } from 'yuzuha/testing';
import guildicon from '../commands/guildicon.js';
import guildbanner from '../commands/guildbanner.js';
import { emoji } from '../src/emoji.js';

test('guildicon e guildbanner avisam quando servidor nao tem arte ou fora de guild', async (t) => {
  const fixture = createTestBot({
    prefix: 'a.',
    commands: [guildicon, guildbanner],
    emoji,
    resources: {
      users: {
        async guild(guildID: string) {
          return { id: guildID, name: 'Vazio', ownerID: '1', iconURL: null, bannerURL: null, memberCount: 1, createdTimestamp: 0 };
        },
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.sbanner'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não possui um banner configurado/);

  assert.equal(await fixture.send('a.guildicon', { guildID: '' }), 'guarded');
});
