import { cleanReason } from 'yuzuha';
import type { AceContext } from './context.js';

const SNOWFLAKE = /^\d{5,}$/;
const MENTION = /^<@!?(\d+)>$/;

export type TargetResult =
  | { status: 'found'; id: string; /** Apelido já resolvido — sem fetch extra antes da ação. */ label?: string }
  | { status: 'none' }
  | { status: 'missing'; query: string }
  | { status: 'ambiguous'; query: string };

/** tokens[0] é o alvo — delega pro resolver nativo (menção, ID, nome exato ou prefixo). */
export async function resolveTarget(ctx: AceContext, _guildID: string, tokens: readonly string[]): Promise<TargetResult> {
  const token = tokens[0];
  if (!token) return { status: 'none' };
  // Tag legada user#0001: o resolver nativo não conhece discrim — busca pelo nome.
  const resolved = await ctx.members.resolve(token.replace(/#\d{1,6}$/, '') || token);
  switch (resolved.status) {
    case 'found': return { status: 'found', id: resolved.id, label: resolved.label };
    case 'ambiguous': return { status: 'ambiguous', query: token };
    case 'missing': return { status: 'missing', query: resolved.query || token };
  }
}

/** Alvo de unban: resolveBan nativo confere o ban na própria busca — missing vira "não está banido". */
export async function resolveBanTarget(ctx: AceContext, _guildID: string, tokens: readonly string[]): Promise<TargetResult> {
  const token = tokens[0];
  if (!token) return { status: 'none' };
  const resolved = await ctx.members.resolveBan(token);
  switch (resolved.status) {
    case 'found': return { status: 'found', id: resolved.id, label: resolved.label };
    case 'ambiguous': return { status: 'ambiguous', query: token };
    case 'missing': return { status: 'missing', query: resolved.query || token };
  }
}

export type AssetTarget =
  | { status: 'found'; id: string }
  | { status: 'invalid' }
  | { status: 'missing'; query: string }
  | { status: 'ambiguous'; query: string };

/** Alvo de avatar/banner: vazio resolve o autor (inclusive em DM); nome só vale em servidor. */
export async function resolveAssetTarget(ctx: AceContext): Promise<AssetTarget> {
  if (!ctx.message.guildID) {
    const resolved = await ctx.members.resolveUser(ctx.tokens[0], { default: 'author' });
    return resolved.status === 'found'
      ? { status: 'found', id: resolved.id }
      : { status: 'invalid' };
  }
  const target = await resolveTarget(ctx, ctx.message.guildID, ctx.tokens);
  switch (target.status) {
    case 'found': return { status: 'found', id: target.id };
    case 'none': return { status: 'found', id: ctx.authorID };
    case 'missing': {
      // Avatar/info aceitam usuário global: menção/ID sem membro segue found e
      // quem busca (embed/info) cai pro users.user com a mensagem própria.
      const token = ctx.tokens[0] ?? '';
      const id = MENTION.exec(token)?.[1] ?? (SNOWFLAKE.test(token) ? token : undefined);
      return id ? { status: 'found', id } : target;
    }
    default: return target;
  }
}

/** tokens[0] é o alvo; motivo vem do resto, já sem menções soltas (ping de reply). */
export function moderationReason(ctx: AceContext, skip = 1): string {
  return cleanReason(ctx.tokens.slice(skip).join(' ')) || 'Sem motivo informado.';
}

export function targetUserID(ctx: AceContext): string {
  const first = ctx.tokens[0] ? MENTION.exec(ctx.tokens[0])?.[1] : undefined;
  return first ?? ctx.message.mentions[0] ?? ctx.tokens.find((token) => SNOWFLAKE.test(token)) ?? ctx.authorID;
}
