import { brand as initialBrand } from './brand.js';
import { runChannelLock as initialLock, type LockAction } from './channel-lock.js';
import type { AceContext } from './context.js';
import { replyGuildAsset as initialGuildAsset, replyUserAsset as initialUserAsset, type GuildAsset, type UserAsset } from './embed.js';
import { replyEmojiDump as initialDump } from './emoji-dump.js';
import { formatAge as initialAge, formatDayStamp as initialDay, formatStamp as initialStamp } from './format.js';
import { replyGuildInfo as initialGuildInfo, replyUserInfo as initialUserInfo } from './info.js';
import { grantJoinRole as initialGrant, type JoinMember } from './join-role.js';
import { isBareMention as initialBare, mentionMessage as initialMention, unknownCommandMessage as initialUnknown } from './mention.js';
import { prefix as initialPrefix } from './prefix.js';
import { runPurge as initialPurge, type PurgeMode } from './purge.js';
import { runModeration as initialModeration, type Punishment } from './punish.js';
import { moderationReason as initialReason, resolveAssetTarget as initialAsset, resolveBanTarget as initialBanResolve, resolveTarget as initialResolve, targetUserID as initialTarget, type AssetTarget, type TargetResult } from './resolve.js';

type PrefixFn = () => string;
type MentionFn = (commandPrefix: string) => string;
type BareFn = (content: string, selfId: string, mentioned: boolean) => boolean;
type UnknownFn = (content: string, commandPrefix: string, names: readonly string[]) => string | undefined;
type GrantFn = (member: JoinMember) => Promise<boolean>;
type ModerationFn = (ctx: AceContext, action: Punishment) => Promise<void>;
type ChannelLockFn = (ctx: AceContext, action: LockAction) => Promise<void>;
type TargetFn = (ctx: AceContext) => string;
type ResolveFn = (ctx: AceContext, guildID: string, tokens: readonly string[]) => Promise<TargetResult>;
type AssetResolveFn = (ctx: AceContext) => Promise<AssetTarget>;
type ReasonFn = (ctx: AceContext, skip?: number) => string;
type StampFn = (date: Date) => string;
type AgeFn = (date: Date, now?: number) => string;
type InfoFn = (ctx: AceContext) => Promise<void>;
type UserAssetFn = (ctx: AceContext, kind: UserAsset) => Promise<void>;
type GuildAssetFn = (ctx: AceContext, kind: GuildAsset) => Promise<void>;
type PurgeFn = (ctx: AceContext, mode: PurgeMode) => Promise<void>;
type DumpFn = (ctx: AceContext) => Promise<void>;

export type RuntimeBrand = { primary: number; eyes: number; background: number };

export type RuntimeInstall = {
  prefix: PrefixFn;
  mentionMessage: MentionFn;
  isBareMention: BareFn;
  unknownCommandMessage: UnknownFn;
  grantJoinRole: GrantFn;
  runModeration: ModerationFn;
  runChannelLock: ChannelLockFn;
  targetUserID: TargetFn;
  resolveTarget: ResolveFn;
  resolveBanTarget: ResolveFn;
  resolveAssetTarget: AssetResolveFn;
  moderationReason: ReasonFn;
  formatStamp: StampFn;
  formatDayStamp: StampFn;
  formatAge: AgeFn;
  replyUserInfo: InfoFn;
  replyGuildInfo: InfoFn;
  replyUserAsset: UserAssetFn;
  replyGuildAsset: GuildAssetFn;
  runPurge: PurgeFn;
  replyEmojiDump: DumpFn;
  brand: RuntimeBrand;
};

// Módulos recarregáveis falam entre si por estes wrappers: o import estático de
// live.js sobrevive ao hot-reload, os slots apontam sempre pra última versão.
const slots: RuntimeInstall = {
  prefix: initialPrefix,
  mentionMessage: initialMention,
  isBareMention: initialBare,
  unknownCommandMessage: initialUnknown,
  grantJoinRole: initialGrant,
  runModeration: initialModeration,
  runChannelLock: initialLock,
  targetUserID: initialTarget,
  resolveTarget: initialResolve,
  resolveBanTarget: initialBanResolve,
  resolveAssetTarget: initialAsset,
  moderationReason: initialReason,
  formatStamp: initialStamp,
  formatDayStamp: initialDay,
  formatAge: initialAge,
  replyUserInfo: initialUserInfo,
  replyGuildInfo: initialGuildInfo,
  replyUserAsset: initialUserAsset,
  replyGuildAsset: initialGuildAsset,
  runPurge: initialPurge,
  replyEmojiDump: initialDump,
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

export function runChannelLock(ctx: AceContext, action: LockAction): Promise<void> {
  return slots.runChannelLock(ctx, action);
}

export function targetUserID(ctx: AceContext): string {
  return slots.targetUserID(ctx);
}

export function resolveTarget(ctx: AceContext, guildID: string, tokens: readonly string[]): Promise<TargetResult> {
  return slots.resolveTarget(ctx, guildID, tokens);
}

export function resolveBanTarget(ctx: AceContext, guildID: string, tokens: readonly string[]): Promise<TargetResult> {
  return slots.resolveBanTarget(ctx, guildID, tokens);
}

export function resolveAssetTarget(ctx: AceContext): Promise<AssetTarget> {
  return slots.resolveAssetTarget(ctx);
}

export function moderationReason(ctx: AceContext, skip?: number): string {
  return slots.moderationReason(ctx, skip);
}

export function formatStamp(date: Date): string {
  return slots.formatStamp(date);
}

export function formatDayStamp(date: Date): string {
  return slots.formatDayStamp(date);
}

export function formatAge(date: Date, now?: number): string {
  return slots.formatAge(date, now);
}

export function replyUserInfo(ctx: AceContext): Promise<void> {
  return slots.replyUserInfo(ctx);
}

export function replyGuildInfo(ctx: AceContext): Promise<void> {
  return slots.replyGuildInfo(ctx);
}

export function replyUserAsset(ctx: AceContext, kind: UserAsset): Promise<void> {
  return slots.replyUserAsset(ctx, kind);
}

export function replyGuildAsset(ctx: AceContext, kind: GuildAsset): Promise<void> {
  return slots.replyGuildAsset(ctx, kind);
}

export function replyEmojiDump(ctx: AceContext): Promise<void> {
  return slots.replyEmojiDump(ctx);
}

export function runPurge(ctx: AceContext, mode: PurgeMode): Promise<void> {
  return slots.runPurge(ctx, mode);
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
  const functions: (keyof RuntimeInstall)[] = [
    'grantJoinRole', 'runModeration', 'runChannelLock', 'targetUserID',
    'resolveTarget', 'resolveBanTarget', 'resolveAssetTarget', 'moderationReason',
    'formatStamp', 'formatDayStamp', 'formatAge',
    'replyUserInfo', 'replyGuildInfo', 'replyUserAsset', 'replyGuildAsset', 'runPurge',
  ];
  for (const name of functions) {
    if (typeof next[name] !== 'function') throw new Error(`${name}() não é função.`);
  }
  color(next.brand.primary, 'primary');
  color(next.brand.eyes, 'eyes');
  color(next.brand.background, 'background');
  for (const name of functions) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (slots as Record<keyof RuntimeInstall, unknown>)[name] = next[name] as any;
  }
  slots.prefix = next.prefix;
  slots.mentionMessage = next.mentionMessage;
  slots.isBareMention = next.isBareMention;
  slots.unknownCommandMessage = next.unknownCommandMessage;
  // Quem importa brand segura a referência: muta in-place, nunca troca o objeto.
  Object.assign(brand, next.brand);
}
