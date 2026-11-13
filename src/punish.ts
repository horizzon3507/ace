import { formatDuration, GuardError, isGuardReason, MAX_TIMEOUT_MS, parseDuration, YuzuhaError } from 'yuzuha';
import type { AceContext } from './context.js';
import { moderationReason as bundledReason, resolveBanTarget as bundledBanResolve, resolveTarget as bundledResolve } from './resolve.js';

export type Punishment = 'kick' | 'ban' | 'softban' | 'timeout' | 'unban';

export type ModerationDeps = {
  resolveTarget: typeof bundledResolve;
  resolveBanTarget: typeof bundledBanResolve;
  moderationReason: typeof bundledReason;
};

const copy = {
  kick: { past: 'expulso', fail: 'expulsar', mark: 'kick', perm: 'Expulsar membros' },
  ban: { past: 'banido', fail: 'banir', mark: 'ban', perm: 'Banir membros' },
  softban: { past: 'expulso', fail: 'expulsar', mark: 'ban', perm: 'Banir membros' },
  timeout: { past: 'silenciado', fail: 'silenciar', mark: 'time', perm: 'Moderar membros' },
  unban: { past: 'desbanido', fail: 'desbanir', mark: 'unban', perm: 'Banir membros' },
} as const;

/** Reescreve os GuardErrors por reason tipado (0.3.1) — nada de sniffing na mensagem. */
function guardReply(error: GuardError, spec: (typeof copy)[Punishment], emoji: Record<string, string>): string | null {
  switch (error.reason) {
    case 'ADMIN_IMMUNE':
      return `${emoji.unhappy} Eu não posso silenciar um administrador...`;
    case 'HIERARCHY':
    case 'OWNER_TARGET':
      return `${emoji.unhappy} Eu não posso ${spec.fail} este membro! O cargo dele está acima do seu ou do meu...`;
    case 'SELF_TARGET':
      return `${emoji.unhappy} Você não pode me usar pra ${spec.fail} a si mesmo...`;
    case 'BOT_TARGET':
      return `${emoji.unhappy} Eu não posso me ${spec.fail} do servidor...`;
    case 'PERMISSION_MISSING_BOT':
      return `${emoji.unhappy} Eu preciso da permissão ${spec.perm} para isso...`;
    case 'PERMISSION_MISSING_AUTHOR':
      return `${emoji.unhappy} Você precisa da permissão ${spec.perm}...`;
    default:
      return null;
  }
}

/** Erro de "membro fora do servidor" — GuardError tipado ou código legado do adapter. */
function memberGone(error: unknown): boolean {
  if (isGuardReason(error, 'MEMBER_NOT_FOUND')) return true;
  return error instanceof YuzuhaError && error.code === 'MEMBER_NOT_FOUND';
}

/** Erro de "alvo sem ban ativo" no unban — mesmo esquema do memberGone. */
function notBanned(error: unknown): boolean {
  return isGuardReason(error, 'NOT_BANNED');
}

/** Fecha sobre o resolve desta carga — o dev-reload passa os módulos frescos. */
export function bindModeration(deps: ModerationDeps) {
  const { resolveTarget, resolveBanTarget, moderationReason } = deps;

  return async function runModeration(ctx: AceContext, action: Punishment): Promise<void> {
    const spec = copy[action];
    const guildID = ctx.requireGuild();
    const emoji = ctx.emoji;
    const target = await (action === 'unban' ? resolveBanTarget : resolveTarget)(ctx, guildID, ctx.tokens);
    if (target.status === 'none') {
      await ctx.reply(`${emoji.unhappy} Por favor, me informe o membro a ser ${spec.past}...\n-# ╰ Ex: \`a.${action} @usuario motivo\``);
      return;
    }
    if (target.status === 'missing') {
      // Unban por menção/ID: o alvo existe — missing significa "sem ban ativo".
      // Por nome, é o "não encontrei" de sempre.
      const ref = /^<@!?\d+>$|^\d+$/.test(ctx.tokens[0] ?? '');
      await ctx.reply(action === 'unban' && ref
        ? `${emoji.unhappy} Este usuário não está banido neste servidor...`
        : `${emoji.unhappy} Eu não encontrei ninguém como ${target.query}! Use menção ou ID de usuário...`);
      return;
    }
    if (target.status === 'ambiguous') {
      await ctx.reply(`${emoji.unhappy} Eu encontrei vários membros como ${target.query}! Use menção ou forneça o ID de usuário...`);
      return;
    }

    const { id } = target;
    let timeoutMs = 0;
    if (action === 'timeout') {
      try {
        timeoutMs = parseDuration(ctx.tokens[1] ?? '');
      } catch {
        await ctx.reply(`${emoji.unhappy} Por favor, me informe a duração do silenciamento...\n-# ╰ Ex: \`a.timeout @usuario 10m motivo\``);
        return;
      }
      if (timeoutMs > MAX_TIMEOUT_MS) {
        await ctx.reply(`${emoji.unhappy} O silenciamento não pode passar de 28 dias...`);
        return;
      }
    }
    const reason = moderationReason(ctx, action === 'timeout' ? 2 : 1);
    const name = target.label ?? id;
    try {
      if (action === 'ban') await ctx.mod.ban(id, { reason });
      else if (action === 'softban') {
        await ctx.mod.ban(id, { reason, deleteMessageDays: 7 });
        await ctx.mod.unban(id, { reason });
      }
      else if (action === 'timeout') await ctx.mod.timeout(id, { reason, duration: timeoutMs });
      else if (action === 'unban') await ctx.mod.unban(id, { reason });
      else await ctx.mod.kick(id, { reason });
      const headline = action === 'timeout'
        ? `**${name}** foi **${spec.past}** por **${formatDuration(timeoutMs)}**`
        : action === 'unban'
          ? `**${name}** foi **${spec.past}** do servidor`
          : action === 'softban'
            ? `**${name}** foi ${spec.past} do servidor e teve as mensagens recentes limpas`
            : `**${name}** foi ${spec.past} do servidor`;
      await ctx.reply(`${emoji[spec.mark]} ${headline}.\n-# ╰ Motivo: ${reason} | ID: ${id}`);
    } catch (error) {
      if (error instanceof GuardError) {
        const rewritten = guardReply(error, spec, emoji);
        if (rewritten) {
          await ctx.reply(rewritten);
          return;
        }
      }
      if (action === 'unban' && notBanned(error)) {
        await ctx.reply(`${emoji.unhappy} Este usuário não está banido neste servidor...`);
        return;
      }
      // GuardError/PartialModerationError sobem: a framework responde e o outcome fica honesto.
      if (error instanceof YuzuhaError && !memberGone(error)) throw error;
      await ctx.reply(memberGone(error)
        ? `${emoji.unhappy} Eu não consigo ${spec.fail} um usuário que não está mais neste servidor...`
        : `${emoji.unhappy} Eu não consegui ${spec.fail} este membro...`);
    }
  };
}

export const runModeration = bindModeration({
  resolveTarget: bundledResolve,
  resolveBanTarget: bundledBanResolve,
  moderationReason: bundledReason,
});
