import { SDK } from 'yuzuha';
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

const SEND = SDK.PermissionFlags.SendMessages;

/** Mexe só no bit de SendMessages: o resto da máscara do @everyone (ex.: deny de ViewChannel em canal privado) sobrevive intacto. */
export function everyoneMasks(
  current: { allow: bigint; deny: bigint } | undefined,
  action: LockAction,
) {
  const allow = (current?.allow ?? 0n) & ~SEND;
  const deny = action === 'lock'
    ? (current?.deny ?? 0n) | SEND
    : (current?.deny ?? 0n) & ~SEND;
  return { allow, deny, neutral: allow === 0n && deny === 0n, had: current !== undefined };
}

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
      await ctx.reply(`${emoji.unhappy} Eu não encontrei nenhum canal como ${first ?? channelID}... Use menção ou ID do canal!`);
      return;
    }
    if (!TEXT_TYPES.has(channel.type)) {
      await ctx.reply(`${emoji.unhappy} Eu não consigo ${spec.wrongType} este tipo de canal... Só funciona em canais de texto!`);
      return;
    }
    // O PUT de overwrite substitui a máscara inteira — ler o estado atual via client
    // nativo para não apagar outros bits (deny de ViewChannel de canal privado, etc.).
    let overwrites: SDK.GuildChannel['permissionOverwrites'] | undefined;
    try {
      const raw = await ctx.client.channels.resolve(channel.id);
      overwrites = raw instanceof SDK.GuildChannel ? raw.permissionOverwrites : undefined;
    } catch {
      overwrites = undefined; // sem client nativo (testes) → caminho simples
    }
    if (overwrites) {
      const current = overwrites.cache.get(guildID);
      const next = everyoneMasks(
        current ? { allow: current.allow.bitfield, deny: current.deny.bitfield } : undefined,
        action,
      );
      if (next.neutral) {
        if (next.had) await overwrites.delete(guildID);
      } else {
        await overwrites.edit(guildID, { type: SDK.OverwriteType.Role, allow: next.allow, deny: next.deny });
      }
    } else {
      const grant = action === 'lock' ? { deny: ['SendMessages'] } : { allow: [], deny: [] };
      await ctx.resources.channels.overwrite(channel.id, guildID, {
        ...grant,
        type: 'role',
        reason: `${ctx.authorName}: ${reason}`,
      });
    }
    const body = action === 'lock'
      ? `Ninguém mais consegue enviar mensagens ${ref ? 'lá' : 'aqui'} por enquanto`
      : 'As mensagens estão liberadas novamente';
    await ctx.reply(`${emoji[spec.mark]} Canal ${ref ? `<#${channel.id}> ` : ''}**${spec.state}**! ${body}...\n-# ╰ Motivo: ${reason}`);
  };
}

export const runChannelLock = bindChannelLock({ emoji: bundledEmoji });
