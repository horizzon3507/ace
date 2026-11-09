import type { AceContext } from './context.js';

export type LockAction = 'lock' | 'unlock';

const copy = {
  lock: { state: 'trancado', wrongType: 'trancar' },
  unlock: { state: 'destrancado', wrongType: 'destrancar' },
} as const;

/** GuildText (0), GuildVoice (2) e GuildAnnouncement (5) — o nativo escolhe o bit certo por tipo. */
const LOCKABLE_TYPES = new Set([0, 2, 5]);

export async function runChannelLock(ctx: AceContext, action: LockAction): Promise<void> {
  const { emoji } = ctx;
  const spec = copy[action];
  ctx.requireGuild();
  const first = ctx.tokens[0];
  const ref = first === undefined
    ? undefined
    : (first.match(/^<#(\d+)>$/)?.[1] ?? (/^\d{15,}$/.test(first) ? first : undefined));
  const channelID = ref ?? ctx.channelID;
  const reason = (ref ? ctx.tokens.slice(1) : ctx.tokens)
    .filter((token) => !token.startsWith('<@'))
    .join(' ')
    .trim() || 'Sem motivo informado.';

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
