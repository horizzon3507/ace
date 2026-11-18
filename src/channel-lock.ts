import type { AceContext } from './context.js';

export type LockAction = 'lock' | 'unlock';

const copy = {
  lock: { state: 'trancado', wrongType: 'trancar' },
  unlock: { state: 'destrancado', wrongType: 'destrancar' },
} as const;

/** GuildText (0), GuildVoice (2) e GuildAnnouncement (5) — o nativo escolhe o bit certo por tipo. */
const LOCKABLE_TYPES = new Set([0, 2, 5]);
const CHANNEL_MENTION_RE = /^<#(\d+)>$/;
const CHANNEL_ID_RE = /^\d{15,}$/;

export function parseChannelRef(token?: string): string | undefined {
  if (token === undefined) return undefined;
  return CHANNEL_MENTION_RE.exec(token)?.[1] ?? (CHANNEL_ID_RE.test(token) ? token : undefined);
}

export async function runChannelLock(ctx: AceContext, action: LockAction): Promise<void> {
  const { emoji } = ctx;
  const spec = copy[action];
  ctx.requireGuild();
  const first = ctx.tokens[0];
  const ref = parseChannelRef(first);
  const channelID = ref ?? ctx.channelID;
  let reason = '';
  for (let i = ref ? 1 : 0; i < ctx.tokens.length; i += 1) {
    const token = ctx.tokens[i]!;
    if (token.startsWith('<@')) continue;
    reason = reason ? `${reason} ${token}` : token;
  }
  reason = reason.trim() || 'Sem motivo informado.';

  const channel = await ctx.resources.channels.get(channelID).catch(() => null);
  if (!channel) {
    await ctx.reply(`${emoji.unhappy} Eu não encontrei nenhum canal como ${first ?? channelID}! Use menção ou ID do canal...`);
    return;
  }
  if (!LOCKABLE_TYPES.has(channel.type)) {
    await ctx.reply(`${emoji.unhappy} Eu não consigo ${spec.wrongType} este tipo de canal! Só funciona em canais de texto, voz e anúncios...`);
    return;
  }
  // lock/unlock nativos fazem merge nos bits do @everyone — outros denies sobrevivem.
  const result = await ctx.resources.channels[action](channel.id, {
    reason: `${ctx.authorName}: ${reason}`,
  });
  const voice = result.permission === 'Connect';
  const body = action === 'lock'
    ? voice
      ? `Ninguém mais consegue entrar ${ref ? 'lá' : 'aqui'} por enquanto`
      : `Ninguém mais consegue enviar mensagens ${ref ? 'lá' : 'aqui'} por enquanto`
    : voice
      ? 'A entrada está liberada novamente'
      : 'As mensagens estão liberadas novamente';
  await ctx.reply(`${emoji[action]} Canal ${ref ? `<#${channel.id}> ` : ''}**${spec.state}**! ${body}.\n-# ╰ Motivo: ${reason}`);
}
