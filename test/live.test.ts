import test from 'node:test';
import assert from 'node:assert/strict';
import { brand as sourceBrand } from '../src/brand.js';
import { brand, grantJoinRole, installRuntime, isBareMention, mentionMessage, prefix, unknownCommandMessage } from '../src/live.js';
import { grantJoinRole as sourceGrant } from '../src/join-role.js';
import { unknownCommandMessage as sourceUnknown } from '../src/mention.js';

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
  installRuntime({
    prefix: () => previous.prefix,
    mentionMessage: () => previous.mention,
    isBareMention: (content, selfId, mentioned) => mentioned && content.includes(selfId),
    unknownCommandMessage: sourceUnknown,
    grantJoinRole: sourceGrant,
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
    brand: { primary: 1, eyes: 1, background: 1 },
  }), /prefix/);
  assert.equal(prefix(), current);
  assert.throws(() => installRuntime({
    prefix: () => 'a.',
    mentionMessage: () => 'x',
    isBareMention: () => true,
    unknownCommandMessage: sourceUnknown,
    grantJoinRole: async () => false,
    brand: { primary: 0x1000000, eyes: 1, background: 1 },
  }), /primary/);
  assert.equal(brand.primary, sourceBrand.primary);
});
