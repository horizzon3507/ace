import test from 'node:test';
import assert from 'node:assert/strict';
import type { AceContext } from '../src/context.js';
import { moderationReason, resolveAssetTarget, resolveBanTarget, resolveTarget, targetUserID } from '../src/resolve.js';

function stubCtx(overrides: Partial<AceContext> = {}): AceContext {
  return {
    authorID: '999',
    tokens: [],
    message: { id: 'm1', channelID: 'c1', guildID: '100', authorID: '999', authorName: 'A', authorBot: false, content: '', mentions: [] },
    members: {
      resolve: async (q: string) => ({ status: 'missing', query: q }),
      resolveBan: async (q: string) => ({ status: 'missing', query: q }),
      resolveUser: async (q?: string) => ({ status: 'found', id: q || '999', label: 'A', mention: '<@999>', via: 'id' }),
    },
    ...overrides,
  } as unknown as AceContext;
}

test('resolveTarget remove discriminador legado apenas quando ha #', async () => {
  let seenQuery = '';
  const ctx = stubCtx({
    members: {
      resolve: async (q: string) => {
        seenQuery = q;
        return { status: 'found', id: '42', label: 'Glacial', mention: '<@42>', via: 'exact' };
      },
    } as unknown as AceContext['members'],
  });
  const res = await resolveTarget(ctx, '100', ['glacial#0001']);
  assert.equal(seenQuery, 'glacial');
  assert.deepEqual(res, { status: 'found', id: '42', label: 'Glacial' });
  assert.deepEqual(await resolveTarget(ctx, '100', []), { status: 'none' });
});

test('resolveBanTarget e moderationReason respeitam argumentos e mencoes', async () => {
  const ctx = stubCtx({
    tokens: ['<@2>', 'spam', 'por', '<@3>', 'aqui'],
    members: {
      resolveBan: async () => ({ status: 'found', id: '2', label: 'Alvo', reason: 'ban', via: 'id' }),
    } as unknown as AceContext['members'],
  });
  assert.deepEqual(await resolveBanTarget(ctx, '100', ['<@2>']), { status: 'found', id: '2', label: 'Alvo' });
  assert.equal(moderationReason(ctx), 'spam por aqui');
  assert.equal(moderationReason(stubCtx({ tokens: ['<@2>'] })), 'Sem motivo informado.');
});

test('resolveAssetTarget e targetUserID aplicam fallbacks de DM e servidor', async () => {
  const dmCtx = stubCtx({
    message: { id: 'm1', channelID: 'c1', guildID: '', authorID: '999', authorName: 'A', authorBot: false, content: '', mentions: [] },
    tokens: [],
  });
  assert.deepEqual(await resolveAssetTarget(dmCtx), { status: 'found', id: '999' });

  const guildMissingId = stubCtx({ tokens: ['123456789012345'] });
  assert.deepEqual(await resolveAssetTarget(guildMissingId), { status: 'found', id: '123456789012345' });

  assert.equal(targetUserID(stubCtx({ tokens: ['texto', '12345678'] })), '12345678');
  assert.equal(targetUserID(stubCtx({ tokens: ['<@!77>'] })), '77');
  assert.equal(targetUserID(stubCtx({ tokens: [] })), '999');
});
