import { brand as initialBrand } from './brand.js';
import type { AceContext } from './context.js';
import { grantJoinRole as initialGrant, type JoinMember } from './join-role.js';
import { isBareMention as initialBare, mentionMessage as initialMention, unknownCommandMessage as initialUnknown } from './mention.js';
import { prefix as initialPrefix } from './prefix.js';
import { runModeration as initialModeration, type Punishment } from './punish.js';
import { targetUserID as initialTarget } from './resolve.js';

type PrefixFn = () => string;
type MentionFn = (commandPrefix: string) => string;
type BareFn = (content: string, selfId: string, mentioned: boolean) => boolean;
type UnknownFn = (content: string, commandPrefix: string, names: readonly string[]) => string | undefined;
type GrantFn = (member: JoinMember) => Promise<boolean>;
type ModerationFn = (ctx: AceContext, action: Punishment) => Promise<void>;
type TargetFn = (ctx: AceContext) => string;

export type RuntimeBrand = { primary: number; eyes: number; background: number };

export type RuntimeInstall = {
  prefix: PrefixFn;
  mentionMessage: MentionFn;
  isBareMention: BareFn;
  unknownCommandMessage: UnknownFn;
  grantJoinRole: GrantFn;
  runModeration: ModerationFn;
  targetUserID: TargetFn;
  brand: RuntimeBrand;
};

const slots: RuntimeInstall = {
  prefix: initialPrefix,
  mentionMessage: initialMention,
  isBareMention: initialBare,
  unknownCommandMessage: initialUnknown,
  grantJoinRole: initialGrant,
  runModeration: initialModeration,
  targetUserID: initialTarget,
  brand: {
    primary: initialBrand.primary,
    eyes: initialBrand.eyes,
    background: initialBrand.background,
  },
};

export const brand: RuntimeBrand = slots.brand;

export function prefix(): string {
  return slots.prefix();
}

export function mentionMessage(commandPrefix: string): string {
  return slots.mentionMessage(commandPrefix);
}

export function isBareMention(content: string, selfId: string, mentioned: boolean): boolean {
  return slots.isBareMention(content, selfId, mentioned);
}

export function unknownCommandMessage(content: string, commandPrefix: string, names: readonly string[]): string | undefined {
  return slots.unknownCommandMessage(content, commandPrefix, names);
}

export function grantJoinRole(member: JoinMember): Promise<boolean> {
  return slots.grantJoinRole(member);
}

export function runModeration(ctx: AceContext, action: Punishment): Promise<void> {
  return slots.runModeration(ctx, action);
}

export function targetUserID(ctx: AceContext): string {
  return slots.targetUserID(ctx);
}

function color(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffff) {
    throw new Error(`cor ${name} inválida.`);
  }
}

export function installRuntime(next: RuntimeInstall): void {
  const commandPrefix = next.prefix();
  if (typeof commandPrefix !== 'string' || commandPrefix.length === 0) {
    throw new Error('prefix() não devolveu texto.');
  }
  const mention = next.mentionMessage(commandPrefix);
  if (typeof mention !== 'string' || mention.length === 0) {
    throw new Error('mentionMessage() não devolveu texto.');
  }
  if (typeof next.isBareMention('<@1>', '1', true) !== 'boolean') {
    throw new Error('isBareMention() não devolveu boolean.');
  }
  if (typeof next.unknownCommandMessage('a.nope', 'a.', []) !== 'string' || next.unknownCommandMessage('a.ajuda', 'a.', ['ajuda']) != null) {
    throw new Error('unknownCommandMessage() não separou comando faltando de comando conhecido.');
  }
  if (typeof next.grantJoinRole !== 'function') {
    throw new Error('grantJoinRole() não é função.');
  }
  if (typeof next.runModeration !== 'function') {
    throw new Error('runModeration() não é função.');
  }
  if (typeof next.targetUserID !== 'function') {
    throw new Error('targetUserID() não é função.');
  }
  color(next.brand.primary, 'primary');
  color(next.brand.eyes, 'eyes');
  color(next.brand.background, 'background');
  slots.prefix = next.prefix;
  slots.mentionMessage = next.mentionMessage;
  slots.isBareMention = next.isBareMention;
  slots.unknownCommandMessage = next.unknownCommandMessage;
  slots.grantJoinRole = next.grantJoinRole;
  slots.runModeration = next.runModeration;
  slots.targetUserID = next.targetUserID;
  // Quem importa brand segura a referência: muta in-place, nunca troca o objeto.
  Object.assign(brand, next.brand);
}
