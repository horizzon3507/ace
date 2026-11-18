import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot } from 'yuzuha/testing';
import { defineCommand } from 'yuzuha';
import { emoji } from '../src/emoji.js';
import { replyAsset, replyGuildAsset, replyUserAsset } from '../src/embed.js';
import type { AceContext } from '../src/context.js';

const testCmd = defineCommand({
  name: 'assettest',
  run: async (ctx) => {
    const kind = ctx.tokens[0];
    if (kind === 'direct') await replyAsset(ctx as AceContext, 'Direto', 'https://cdn.fluxer.app/a.png', null);
    else if (kind === 'guild') await replyGuildAsset(ctx as AceContext, 'banner');
    else await replyUserAsset(ctx as AceContext, 'avatar');
  },
});

test('replyAsset, replyGuildAsset e replyUserAsset tratam erros e fallback global', async (t) => {
  const fixture = createTestBot({
    prefix: 'a.',
    commands: [testCmd],
    emoji,
    resources: {
      users: {
        async guild() {
          throw new Error('guild offline');
        },
        async member() {
          throw Object.assign(new Error('not found'), { status: 404 });
        },
        async user(id: string) {
          return {
            id,
            username: '**User*Name**',
            displayName: '',
            bot: false,
            avatarURL: 'https://cdn.fluxer.app/avatars/u.png',
            bannerURL: null,
            createdTimestamp: 0,
          };
        },
      },
    },
  });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.assettest direct'), 'success');
  const direct = fixture.messages.at(-1)?.payload.embeds?.[0];
  assert.equal(direct?.author?.iconURL, undefined);
  assert.equal(direct?.image?.url, 'https://cdn.fluxer.app/a.png?size=4096');

  assert.equal(await fixture.send('a.assettest guild'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /não consegui carregar as informações deste servidor/);

  assert.equal(await fixture.send('a.assettest <@12345>'), 'success');
  assert.equal(fixture.messages.at(-1)?.payload.embeds?.[0]?.author?.name, 'Avatar de UserName');
});
