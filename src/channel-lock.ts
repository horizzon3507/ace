import type { AceContext } from './context.js';
import { emoji as bundledEmoji } from './emoji.js';

export type LockAction = 'lock' | 'unlock';

export type ChannelLockDeps = {
  emoji: { unhappy: string; lock: string; unlock: string };
};

const copy = {
  lock: { mark: 'lock', state: 'trancado', wrongType: 'trancar' },
  unlock: { mark: 'unlock', state: 'destrancado', wrongType: 'destrancar' },
} as const;

/** GuildText (0) e GuildAnnouncement (5) — os únicos onde SendMessages faz sentido. */
const TEXT_TYPES = new Set([0, 5]);

/** Fecha sobre os emojis desta carga. O import estático fica no cache do Node. */
export function bindChannelLock(deps: ChannelLockDeps) {
  const { emoji } = deps;

  return async function runChannelLock(ctx: AceContext, action: LockAction): Promise<void> {
    const spec = copy[action];
    const guildID = ctx.requireGuild();
    const first = ctx.tokens[0];
    const ref = first === undefined
      ? undefined
      : (first.match(/^<#(\d+)>$/)?.[1] ?? (/^\d{15,}$/.test(first) ? first : undefined));
    const channelID = ref ?? ctx.channelID;
    const reason = (ref ? ctx.tokens.slice(1) : ctx.tokens)
      .filter((token) => !token.startsWith('<@'))
      .join(' ')
      .trim() || 'Sem motivo informado.';

    let channel;
    try {
      channel = await ctx.resources.channels.get(channelID);
    } catch {
      await ctx.reply(`${emoji.unhappy} Eu **não encontrei** nenhum canal como **${first ?? channelID}**... Use **menção** ou **ID** do canal!`);
      return;
    }
    if (!TEXT_TYPES.has(channel.type)) {
      await ctx.reply(`${emoji.unhappy} Eu não consigo ${spec.wrongType} **esse tipo de canal**... Só funciona em canais de texto!`);
      return;
    }
    const grant = action === 'lock' ? { deny: ['SendMessages'] } : { allow: ['SendMessages'] };
    await ctx.resources.channels.overwrite(channel.id, guildID, {
      ...grant,
      type: 'role',
      reason: `${ctx.authorName}: ${reason}`,
    });
    const body = action === 'lock'
      ? `Ninguém mais consegue enviar mensagens ${ref ? 'lá' : 'aqui'} por enquanto`
      : 'As mensagens estão liberadas novamente';
    await ctx.reply(`${emoji[spec.mark]} Canal ${ref ? `<#${channel.id}> ` : ''}**${spec.state}**! ${body}...\n-# ╰ Motivo: ${reason}`);
  };
}

export const runChannelLock = bindChannelLock({ emoji: bundledEmoji });
