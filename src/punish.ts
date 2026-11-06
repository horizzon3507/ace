import { GuardError, YuzuhaError } from 'yuzuha';
import type { AceContext } from './context.js';
import { emoji as bundledEmoji } from './emoji.js';
import { moderationReason as bundledReason, resolveBanTarget as bundledBanResolve, resolveTarget as bundledResolve } from './resolve.js';

export type Punishment = 'kick' | 'ban' | 'timeout' | 'unban';

export type ModerationDeps = {
  emoji: { unhappy: string; kick: string; ban: string; time: string; unban: string };
  resolveTarget: typeof bundledResolve;
  resolveBanTarget: typeof bundledBanResolve;
  moderationReason: typeof bundledReason;
};

const copy = {
  kick: { past: 'expulso', fail: 'expulsar', mark: 'kick', perm: 'Expulsar membros' },
  ban: { past: 'banido', fail: 'banir', mark: 'ban', perm: 'Banir membros' },
  timeout: { past: 'silenciado', fail: 'silenciar', mark: 'time', perm: 'Moderar membros' },
  unban: { past: 'desbanido', fail: 'desbanir', mark: 'unban', perm: 'Banir membros' },
} as const;

const DURATION = /^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/;
const UNIT_MS = { ms: 1, s: 1e3, m: 6e4, h: 3.6e6, d: 8.64e7 } as const;
const MAX_TIMEOUT_MS = 2_419_200_000; // 28 dias — teto que o Fluxer aceita.

/** '10 minutos', '2 horas', '1 dia': só a maior unidade, com singular/plural. */
function humanDuration(ms: number): string {
  const units = [
    [8.64e7, 'dia', 'dias'],
    [3.6e6, 'hora', 'horas'],
    [6e4, 'minuto', 'minutos'],
    [1e3, 'segundo', 'segundos'],
    [1, 'milissegundo', 'milissegundos'],
  ] as const;
  const [unit, one, many] = units.find(([size]) => ms >= size)!;
  const amount = ms / unit;
  const shown = Number.isInteger(amount) ? amount : Math.round(amount * 10) / 10;
  return `${shown} ${shown === 1 ? one : many}`;
}

/** Reescreve os GuardErrors do SDK com a voz do Ace; retorna null pros que não reconhece. */
function guardReply(raw: string, spec: (typeof copy)[Punishment], emoji: ModerationDeps['emoji']): string | null {
  if (raw.includes('silenciar um administrador')) return `${emoji.unhappy} Eu não posso silenciar um administrador!`;
  if (raw.includes('hierarquia')) return `${emoji.unhappy} Eu não posso ${spec.fail} esse membro! O cargo dele está acima do seu ou do meu...`;
  if (raw.startsWith('Preciso da permissão')) return `${emoji.unhappy} Eu preciso da permissão ${spec.perm} para isso!`;
  if (raw.startsWith('Você precisa da permissão')) return `${emoji.unhappy} Você precisa da permissão ${spec.perm}!`;
  return null;
}

/** Erro de "membro fora do servidor" — HTTPError solta HTML na message, então confere por padrão. */
function memberGone(error: unknown): boolean {
  if (error instanceof YuzuhaError) return error.code === 'MEMBER_NOT_FOUND';
  const text = error instanceof Error ? error.message : String(error);
  return /\b404\b|unknown (member|user)|member.?not.?found|n[aã]o encontrado/i.test(text);
}

/** Erro de "alvo sem ban ativo" no unban — mesmo esquema de padrão do memberGone. */
function notBanned(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  return /\b404\b|not.?banned|n[aã]o banido/i.test(text);
}

/** Fecha sobre o resolve e os emojis desta carga. O import estático fica no cache do Node. */
export function bindModeration(deps: ModerationDeps) {
  const { emoji, resolveTarget, resolveBanTarget, moderationReason } = deps;

  return async function runModeration(ctx: AceContext, action: Punishment): Promise<void> {
    const spec = copy[action];
    const guildID = ctx.requireGuild();
    const target = await (action === 'unban' ? resolveBanTarget : resolveTarget)(ctx, guildID, ctx.tokens);
    if (target.status === 'none') {
      await ctx.reply(`${emoji.unhappy} Informe o membro a ser ${spec.past}!\n-# ╰ Ex: \`a.${action} @usuario motivo\``);
      return;
    }
    if (target.status === 'missing') {
      await ctx.reply(`${emoji.unhappy} Eu não encontrei ninguém como ${target.query}... Use menção ou ID de usuário.`);
      return;
    }
    if (target.status === 'ambiguous') {
      await ctx.reply(`${emoji.unhappy} Eu encontrei vários membros como ${target.query}... Use menção ou forneça o ID de usuário!`);
      return;
    }

    const { id } = target;
    // Unban por menção/ID cru não passou pela lista: confere se o alvo consta banido.
    // Alvo achado por nome já provou o ban na própria busca.
    if (action === 'unban' && target.label === undefined) {
      try {
        const bans = await ctx.resources.users.bans(guildID, 1000);
        if (!bans.some((ban) => ban.userID === id)) {
          await ctx.reply(`${emoji.unhappy} Esse usuário não está banido nesse servidor!`);
          return;
        }
      } catch {
        // Sem a lista o unban segue: a API responde se o ban não existir.
      }
    }
    if (id === ctx.authorID) {
      await ctx.reply(`${emoji.unhappy} Você não pode me usar pra ${spec.fail} a si mesmo...`);
      return;
    }
    if (id === ctx.transport.botID) {
      await ctx.reply(`${emoji.unhappy} Eu não posso me ${spec.fail} do servidor...`);
      return;
    }
    let timeoutMs = 0;
    if (action === 'timeout') {
      const parsed = DURATION.exec(ctx.tokens[1] ?? '');
      const ms = parsed ? Number(parsed[1]) * UNIT_MS[parsed[2] as keyof typeof UNIT_MS] : 0;
      if (ms > MAX_TIMEOUT_MS) {
        await ctx.reply(`${emoji.unhappy} O silenciamento não pode passar de 28 dias!`);
        return;
      }
      if (!Number.isSafeInteger(ms) || ms <= 0) {
        await ctx.reply(`${emoji.unhappy} Informe a duração do silenciamento!\n-# ╰ Ex: \`a.timeout @usuario 10m motivo\``);
        return;
      }
      timeoutMs = ms;
    }
    const reason = moderationReason(ctx, action === 'timeout' ? 2 : 1);
    // Apelido resolvido antes da ação: falha de label não pode imprimir 'falhou' após banir.
    const name = target.label ?? await memberLabel(ctx, guildID, id).catch(() => id);
    try {
      const record = action === 'ban'
        ? await ctx.mod.ban(id, { reason })
        : action === 'timeout'
          ? await ctx.mod.timeout(id, { reason, duration: ctx.tokens[1]! })
          : action === 'unban'
            ? await ctx.mod.unban(id, { reason })
            : await ctx.mod.kick(id, { reason });
      const caso = record?.id !== undefined ? ` | Caso #${record.id}` : '';
      const headline = action === 'timeout'
        ? `**${name}** foi **${spec.past}** por **${humanDuration(timeoutMs)}**`
        : action === 'unban'
          ? `**${name}** foi **${spec.past}** do servidor`
          : `**${name}** foi ${spec.past} do servidor`;
      await ctx.reply(`${emoji[spec.mark]} ${headline}.\n-# ╰ Motivo: ${reason} | ID: ${id}${caso}`);
    } catch (error) {
      if (error instanceof GuardError) {
        const rewritten = guardReply(error.message, spec, emoji);
        if (rewritten) {
          await ctx.reply(rewritten);
          return;
        }
      }
      if (action === 'unban' && notBanned(error)) {
        await ctx.reply(`${emoji.unhappy} Esse usuário não está banido nesse servidor!`);
        return;
      }
      // GuardError/PartialModerationError sobem: a framework responde e o outcome fica honesto.
      if (error instanceof YuzuhaError && !memberGone(error)) throw error;
      await ctx.reply(memberGone(error)
        ? `${emoji.unhappy} Eu não consigo ${spec.fail} um usuário que não está mais neste servidor!`
        : `${emoji.unhappy} Eu não consegui ${spec.fail} esse membro!`);
    }
  };
}

export const runModeration = bindModeration({
  emoji: bundledEmoji,
  resolveTarget: bundledResolve,
  resolveBanTarget: bundledBanResolve,
  moderationReason: bundledReason,
});

async function memberLabel(ctx: AceContext, guildID: string, id: string): Promise<string> {
  try {
    const member = await ctx.resources.users.member(guildID, id);
    return member.nickname || member.displayName || member.username || id;
  } catch {
    try {
      const user = await ctx.resources.users.user(id);
      return user.displayName || user.username || id;
    } catch {
      return id;
    }
  }
}
