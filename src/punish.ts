import { YuzuhaError } from 'yuzuha';
import type { AceContext } from './context.js';
import { emoji as bundledEmoji } from './emoji.js';
import { moderationReason as bundledReason, resolveTarget as bundledResolve } from './resolve.js';

export type Punishment = 'kick' | 'ban';

export type ModerationDeps = {
  emoji: { unhappy: string; kick: string; ban: string };
  resolveTarget: typeof bundledResolve;
  moderationReason: typeof bundledReason;
};

const copy = {
  kick: { past: 'expulso', fail: 'expulsar', mark: 'kick' },
  ban: { past: 'banido', fail: 'banir', mark: 'ban' },
} as const;

/** Erro de "membro fora do servidor" — HTTPError solta HTML na message, então confere por padrão. */
function memberGone(error: unknown): boolean {
  if (error instanceof YuzuhaError) return error.code === 'MEMBER_NOT_FOUND';
  const text = error instanceof Error ? error.message : String(error);
  return /\b404\b|unknown (member|user)|member.?not.?found|n[aã]o encontrado/i.test(text);
}

/** Fecha sobre o resolve e os emojis desta carga. O import estático fica no cache do Node. */
export function bindModeration(deps: ModerationDeps) {
  const { emoji, resolveTarget, moderationReason } = deps;

  return async function runModeration(ctx: AceContext, action: Punishment): Promise<void> {
    const spec = copy[action];
    const guildID = ctx.requireGuild();
    const target = await resolveTarget(ctx, guildID, ctx.tokens);
    if (target.status === 'none') {
      await ctx.reply(`${emoji.unhappy} **Informe o membro** a ser ${spec.past}!\n-# ╰ Ex: \`a.${action} @usuario motivo\``);
      return;
    }
    if (target.status === 'missing') {
      await ctx.reply(`${emoji.unhappy} Eu não **encontrei ninguém** como **${target.query}**... Use **menção** ou **ID** do usuário.`);
      return;
    }
    if (target.status === 'ambiguous') {
      await ctx.reply(`${emoji.unhappy} Eu **encontrei vários membros** como **${target.query}**... Use **menção** ou forneça o **ID** do usuário!`);
      return;
    }

    const { id } = target;
    const reason = moderationReason(ctx);
    // Apelido resolvido antes da ação: falha de label não pode imprimir 'falhou' após banir.
    const name = target.label ?? await memberLabel(ctx, guildID, id).catch(() => id);
    try {
      const record = action === 'ban'
        ? await ctx.mod.ban(id, { reason })
        : await ctx.mod.kick(id, { reason });
      const caso = record?.id !== undefined ? ` | Caso #${record.id}` : '';
      await ctx.reply(`${emoji[spec.mark]} **${name}** foi ${spec.past} do servidor.\n-# ╰ Motivo: ${reason} | ID: ${id}${caso}`);
    } catch (error) {
      // GuardError/PartialModerationError sobem: a framework responde e o outcome fica honesto.
      if (error instanceof YuzuhaError && !memberGone(error)) throw error;
      await ctx.reply(memberGone(error)
        ? `${emoji.unhappy} Eu não consigo ${spec.fail} um usuário que **não está mais neste servidor**!`
        : `${emoji.unhappy} Eu **não consegui** ${spec.fail} esse membro!`);
    }
  };
}

export const runModeration = bindModeration({
  emoji: bundledEmoji,
  resolveTarget: bundledResolve,
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
