import type { AceContext } from './context.js';
import { resolveTarget } from './resolve.js';

export type PurgeMode = 'channel' | 'user';

const REPLY_TTL_MS = 7_000;
const MENTION = /^<@!?\d+>$/;

export async function runPurge(ctx: AceContext, mode: PurgeMode): Promise<void> {
  const { emoji } = ctx;
  const guildID = ctx.requireGuild();
  let n: number;
  let label: string | undefined;
  let of: string | undefined;

  if (mode === 'user') {
    // A menção vale em qualquer posição (`a.purge 2 @user` ≡ `a.purge @user 2`).
    const mention = ctx.tokens.find((token) => MENTION.test(token));
    const target = await resolveTarget(ctx, guildID, mention ? [mention] : ctx.tokens);
    if (target.status === 'none') {
      await ctx.reply(`${emoji.unhappy} Por favor, me informe o membro cujas mensagens apagar...\n-# ╰ Ex: \`a.purge @usuario 10\``);
      return;
    }
    if (target.status === 'missing') {
      await ctx.reply(`${emoji.unhappy} Eu não encontrei ninguém como ${target.query}! Use menção ou ID de usuário...`);
      return;
    }
    if (target.status === 'ambiguous') {
      await ctx.reply(`${emoji.unhappy} Eu encontrei vários membros como ${target.query}! Use menção ou forneça o ID de usuário...`);
      return;
    }
    const targetToken = mention ?? ctx.tokens[0];
    const countRaw = ctx.tokens.find((token) => token !== targetToken);
    const parsed = countRaw === undefined ? 10 : amount(countRaw);
    if (parsed === undefined) {
      await ctx.reply(`${emoji.unhappy} Por favor, me informe quantas mensagens apagar (de 1 a 99)...\n-# ╰ Ex: \`a.purge @usuario 10\``);
      return;
    }
    n = parsed;
    of = target.id;
    label = target.label ?? target.id;
  } else {
    const parsed = amount(ctx.tokens[0]);
    if (parsed === undefined) {
      await ctx.reply(`${emoji.unhappy} Por favor, me informe quantas mensagens apagar (de 1 a 99)...\n-# ╰ Ex: \`a.clear 20\``);
      return;
    }
    n = parsed;
  }

  // ctx.purge apaga a mensagem do comando junto, fora da contagem — e degrada
  // bulk→por-id sozinho quando a rota em lote falha.
  const { deleted: count } = await ctx.purge(n, of ? { of } : undefined);
  if (count === 0) {
    await ctx.send(`${emoji.unhappy} Eu não encontrei mensagens para apagar...`);
    return;
  }
  const scope = mode === 'user' ? `de @${label}` : 'deste canal';
  await ctx.send(`${emoji.purge} Eu apaguei **${count} ${count === 1 ? 'mensagem' : 'mensagens'}** ${scope}!`, undefined, { ttlMs: REPLY_TTL_MS });
}

/** Inteiro decimal de 1 a 99; ausente, não numérico ou fora da faixa viram undefined. */
function amount(raw: string | undefined): number | undefined {
  if (raw === undefined || !/^\d+$/.test(raw)) return undefined;
  const n = Number.parseInt(raw, 10);
  return n >= 1 && n <= 99 ? n : undefined;
}
