import test from 'node:test';
import assert from 'node:assert/strict';
import { brand as sourceBrand } from '../src/brand.js';
import { runChannelLock as sourceLock } from '../src/channel-lock.js';
import { brand, grantJoinRole, installRuntime, isBareMention, mentionMessage, prefix, targetUserID, unknownCommandMessage } from '../src/live.js';
import { grantJoinRole as sourceGrant } from '../src/join-role.js';
import { unknownCommandMessage as sourceUnknown } from '../src/mention.js';
import { bindModeration, runModeration as sourceModeration } from '../src/punish.js';
import { targetUserID as sourceTarget } from '../src/resolve.js';

const moderation = {
  runModeration: sourceModeration,
  runChannelLock: sourceLock,
  targetUserID: sourceTarget,
};

test('install troca menção, prefixo, cor e cargo no mesmo objeto', async () => {
  const previous = {
    prefix: prefix(),
    mention: mentionMessage(prefix()),
    primary: brand.primary,
    eyes: brand.eyes,
    background: brand.background,
  };
  installRuntime({
    prefix: () => 'z.',
    mentionMessage: (commandPrefix) => `oi ${commandPrefix}`,
    isBareMention: () => false,
    unknownCommandMessage: (_content, commandPrefix, names) => names.length ? undefined : `faltou ${commandPrefix}`,
    grantJoinRole: async () => false,
    runModeration: async () => undefined,
    runChannelLock: async () => undefined,
    targetUserID: () => 'slot',
    brand: { primary: 0x112233, eyes: 0xf1f1f1, background: 0x171717 },
  });
  assert.equal(prefix(), 'z.');
  assert.equal(mentionMessage('z.'), 'oi z.');
  assert.equal(isBareMention('<@1>', '1', true), false);
  assert.equal(unknownCommandMessage('a.nope', 'a.', []), 'faltou a.');
  assert.equal(brand.primary, 0x112233);
  assert.equal(sourceBrand.primary, 0x648de5);
  const member = {
    guild: { id: '1473036495175913548' },
    user: { bot: false },
    roles: { has: () => false, add: async () => undefined },
  };
  assert.equal(await grantJoinRole(member), false);
  assert.equal(targetUserID({} as never), 'slot');
  installRuntime({
    prefix: () => previous.prefix,
    mentionMessage: () => previous.mention,
    isBareMention: (content, selfId, mentioned) => mentioned && content.includes(selfId),
    unknownCommandMessage: sourceUnknown,
    grantJoinRole: sourceGrant,
    ...moderation,
    brand: { primary: previous.primary, eyes: previous.eyes, background: previous.background },
  });
  assert.equal(await grantJoinRole(member), true);
});

test('install rejeita cor e prefixo inválidos e mantém o anterior', () => {
  const current = prefix();
  assert.throws(() => installRuntime({
    prefix: () => '',
    mentionMessage: () => 'x',
    isBareMention: () => true,
    unknownCommandMessage: sourceUnknown,
    grantJoinRole: async () => false,
    ...moderation,
    brand: { primary: 1, eyes: 1, background: 1 },
  }), /prefix/);
  assert.equal(prefix(), current);
  assert.throws(() => installRuntime({
    prefix: () => 'a.',
    mentionMessage: () => 'x',
    isBareMention: () => true,
    unknownCommandMessage: sourceUnknown,
    grantJoinRole: async () => false,
    ...moderation,
    brand: { primary: 0x1000000, eyes: 1, background: 1 },
  }), /primary/);
  assert.equal(brand.primary, sourceBrand.primary);
});

test('bindModeration usa o resolve injetado, não o módulo em cache', async () => {
  const seen: string[] = [];
  const run = bindModeration({
    emoji: { unhappy: 'u', kick: 'k', ban: 'b', time: 't', unban: 'ub' },
    resolveTarget: async () => {
      seen.push('resolve');
      return { status: 'none' };
    },
    resolveBanTarget: async () => ({ status: 'none' }),
    moderationReason: () => 'ignorado',
  });
  await run({
    tokens: ['alguem'],
    authorID: 'autor',
    transport: { botID: 'bot' },
    message: { mentions: [] },
    requireGuild: () => 'guild',
    reply: async (text: string) => {
      seen.push(text);
    },
  } as unknown as Parameters<typeof run>[0], 'kick');
  assert.deepEqual(seen, ['resolve', 'u **Informe o membro** a ser expulso!\n-# ╰ Ex: `a.kick @usuario motivo`']);
});
