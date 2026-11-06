import type { AceContext } from './context.js';

const SNOWFLAKE = /^\d{5,}$/;
const MENTION = /^<@!?(\d+)>$/;

function sameName(query: string, username?: string | null, displayName?: string | null, nickname?: string | null): boolean {
  return [username, displayName, nickname].some((value) => value?.toLowerCase() === query);
}

function startsWithName(query: string, username?: string | null, displayName?: string | null, nickname?: string | null): boolean {
  return [username, displayName, nickname].some((value) => value?.toLowerCase().startsWith(query));
}

function shownName(username?: string | null, displayName?: string | null, nickname?: string | null): string | undefined {
  const name = nickname || displayName || username;
  return name || undefined;
}

export type TargetResult =
  | { status: 'found'; id: string; /** Apelido já conhecido pela busca. Evita um fetch extra antes do kick/ban. */ label?: string }
  | { status: 'none' }
  | { status: 'missing'; query: string }
  | { status: 'ambiguous'; query: string };

/** Casa exata, senão um único membro cujo nome começa com a query. */
function matchMember<T extends { username?: string | null; displayName?: string | null; nickname?: string | null }>(
  query: string,
  members: readonly T[],
): { hit?: T; many: boolean } {
  const exact = members.find((member) => sameName(query, member.username, member.displayName, member.nickname));
  if (exact) return { hit: exact, many: false };
  if (query.length < 2) return { many: false };
  const partial = members.filter((member) => startsWithName(query, member.username, member.displayName, member.nickname));
  return { hit: partial.length === 1 ? partial[0] : undefined, many: partial.length > 1 };
}

/** O alvo vem SEMPRE de tokens[0]: menção depois dele é motivo, não alvo. */
export async function resolveTarget(ctx: AceContext, guildID: string, tokens: readonly string[]): Promise<TargetResult> {
  const token = tokens[0];
  if (!token) return { status: 'none' };
  const mention = MENTION.exec(token);
  if (mention) return { status: 'found', id: mention[1] };
  if (SNOWFLAKE.test(token)) return { status: 'found', id: token };

  const query = token.replace(/^@+/, '').replace(/#\d+$/, '').trim().toLowerCase();
  if (!query) return { status: 'none' };
  if (/^\d+$/.test(query)) return { status: 'missing', query: `ID ${query} (curto demais)` };

  try {
    const page = await ctx.resources.users.searchMembers(guildID, query, 25);
    const { hit, many } = matchMember(query, page.members);
    if (hit) return { status: 'found', id: hit.userID, label: shownName(hit.username, hit.displayName, hit.nickname) };
    return many ? { status: 'ambiguous', query } : { status: 'missing', query };
  } catch {
    try {
      const list = await ctx.resources.users.members(guildID, 1000);
      const { hit, many } = matchMember(query, list);
      if (hit) return { status: 'found', id: hit.id, label: shownName(hit.username, hit.displayName, hit.nickname) };
      return many ? { status: 'ambiguous', query } : { status: 'missing', query };
    } catch {
      return { status: 'missing', query };
    }
  }
}

/** Alvo de unban: menção/ID direto ou busca por nome na lista de bans do servidor. */
export async function resolveBanTarget(ctx: AceContext, guildID: string, tokens: readonly string[]): Promise<TargetResult> {
  const token = tokens[0];
  if (!token) return { status: 'none' };
  const mention = MENTION.exec(token);
  if (mention) return { status: 'found', id: mention[1] };
  // Banido não é membro: qualquer sequência de dígitos é ID candidato — quem
  // chamou confere a existência na lista de bans em vez de exigir um snowflake.
  if (/^\d+$/.test(token)) return { status: 'found', id: token };

  const query = token.replace(/^@+/, '').replace(/#\d+$/, '').trim().toLowerCase();
  if (!query) return { status: 'none' };
  if (/^\d+$/.test(query)) return { status: 'found', id: query };

  try {
    const bans = await ctx.resources.users.bans(guildID, 1000);
    const exact = bans.find((ban) => ban.username.toLowerCase() === query);
    if (exact) return { status: 'found', id: exact.userID, label: exact.username || undefined };
    if (query.length < 2) return { status: 'missing', query };
    const partial = bans.filter((ban) => ban.username.toLowerCase().startsWith(query));
    const hit = partial.length === 1 ? partial[0] : undefined;
    if (hit) return { status: 'found', id: hit.userID, label: hit.username || undefined };
    return partial.length > 1 ? { status: 'ambiguous', query } : { status: 'missing', query };
  } catch {
    return { status: 'missing', query };
  }
}

export type AssetTarget =
  | { status: 'found'; id: string }
  | { status: 'author' }
  | { status: 'invalid' }
  | { status: 'missing'; query: string }
  | { status: 'ambiguous'; query: string };

/** Alvo de avatar/banner: na DM só menção ou ID; em servidor também busca por nome. */
export async function resolveAssetTarget(ctx: AceContext): Promise<AssetTarget> {
  const guildID = ctx.message.guildID;
  if (!guildID) {
    const token = ctx.tokens[0];
    if (!token) return { status: 'author' };
    const id = MENTION.exec(token)?.[1] ?? (SNOWFLAKE.test(token) ? token : undefined);
    return id ? { status: 'found', id } : { status: 'invalid' };
  }
  const target = await resolveTarget(ctx, guildID, ctx.tokens);
  switch (target.status) {
    case 'found': return { status: 'found', id: target.id };
    case 'none': return ctx.tokens.length ? { status: 'invalid' } : { status: 'author' };
    default: return target;
  }
}

/** tokens[0] é o alvo; todo <@…> restante é menção solta no motivo (ex: ping de reply). */
export function moderationReason(ctx: AceContext, skip = 1): string {
  const reason = ctx.tokens
    .slice(skip)
    .filter((token) => !token.startsWith('<@'))
    .join(' ')
    .trim();
  return reason || 'Sem motivo informado.';
}

export function targetUserID(ctx: AceContext): string {
  const first = ctx.tokens[0] ? MENTION.exec(ctx.tokens[0])?.[1] : undefined;
  return first ?? ctx.message.mentions[0] ?? ctx.tokens.find((token) => SNOWFLAKE.test(token)) ?? ctx.authorID;
}
