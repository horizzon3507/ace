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

/** GuildText (0), GuildVoice (2) e GuildAnnouncement (5) — o lock usa Connect em voz e SendMessages no resto. */
const VOICE_TYPES = new Set([2]);
const LOCKABLE_TYPES = new Set([0, 2, 5]);

const SEND = SDK.PermissionFlags.SendMessages;
const CONNECT = SDK.PermissionFlags.Connect;

/** Mexe só no bit do lock: o resto da máscara do @everyone (ex.: deny de ViewChannel em canal privado) sobrevive intacto. */
export function everyoneMasks(
  current: { allow: bigint; deny: bigint } | undefined,
  action: LockAction,
  bit: bigint = SEND,
) {
  const allow = (current?.allow ?? 0n) & ~bit;
  const deny = action === 'lock'
    ? (current?.deny ?? 0n) | bit
    : (current?.deny ?? 0n) & ~bit;
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
      await ctx.reply(`${emoji.unhappy} Eu não encontrei nenhum canal como ${first ?? channelID}! Use menção ou ID do canal...`);
      return;
    }
    if (!LOCKABLE_TYPES.has(channel.type)) {
      await ctx.reply(`${emoji.unhappy} Eu não consigo ${spec.wrongType} este tipo de canal! Só funciona em canais de texto, voz e anúncios...`);
      return;
    }
    const voice = VOICE_TYPES.has(channel.type);
    const bit = voice ? CONNECT : SEND;
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
        bit,
      );
      if (next.neutral) {
        if (next.had) await overwrites.delete(guildID);
      } else {
        await overwrites.edit(guildID, { type: SDK.OverwriteType.Role, allow: next.allow, deny: next.deny });
      }
    } else {
      const grant = action === 'lock' ? { deny: [voice ? 'Connect' : 'SendMessages'] } : { allow: [], deny: [] };
      await ctx.resources.channels.overwrite(channel.id, guildID, {
        ...grant,
        type: 'role',
        reason: `${ctx.authorName}: ${reason}`,
      });
    }
    const body = action === 'lock'
      ? voice
        ? `Ninguém mais consegue entrar ${ref ? 'lá' : 'aqui'} por enquanto`
        : `Ninguém mais consegue enviar mensagens ${ref ? 'lá' : 'aqui'} por enquanto`
      : voice
        ? 'A entrada está liberada novamente'
        : 'As mensagens estão liberadas novamente';
    await ctx.reply(`${emoji[spec.mark]} Canal ${ref ? `<#${channel.id}> ` : ''}**${spec.state}**! ${body}...\n-# ╰ Motivo: ${reason}`);
  };
}

export const runChannelLock = bindChannelLock({ emoji: bundledEmoji });
