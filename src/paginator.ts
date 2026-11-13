import type { Embed } from 'yuzuha';
import type { AceContext } from './context.js';

// Seta única: <:arrowleftfill:…> = próxima página (wrap no fim). O coletor
// filtra e devolve votos pelo NOME do emoji, não pela tag.
const ARROW_NAME = 'arrowleftfill';
const DEFAULT_TIMEOUT_MS = 60_000;

const safe = <T>(fn: () => Promise<T>): Promise<T | null> => Promise.resolve().then(fn).catch(() => null);

/**
 * Paginador por reação: responde com a primeira página, reage a seta custom e
 * escuta os votos do autor pelo coletor nativo — cada voto avança uma página.
 * A reação do autor sai a cada flip pra poder clicar de novo; no fim a seta
 * do bot é limpa.
 */
export async function startPaginator(ctx: AceContext, pages: readonly Embed[], timeoutMs = DEFAULT_TIMEOUT_MS): Promise<void> {
  if (pages.length === 0) return;
  const id = await ctx.reply({ embeds: [pages[0]] });
  if (pages.length < 2) return;
  let page = 0;
  const tag = ctx.emoji.arrowLeft ?? `<:${ARROW_NAME}:1566639260100997120>`;
  await safe(() => ctx.react(tag, id));
  try {
    const votes = ctx.resources.collectors.collectReactions(ctx.channelID, {
      messageID: id,
      emojis: [ARROW_NAME],
      userID: ctx.authorID,
      timeMs: timeoutMs,
    });
    for await (const vote of votes) {
      if (vote.emoji !== ARROW_NAME) continue;
      page = (page + 1) % pages.length;
      await safe(() => ctx.edit(id, { embeds: [pages[page]] }));
      await safe(() => ctx.resources.messages.removeReaction(ctx.channelID, id, vote.emoji, vote.userID));
    }
  } catch {
    // Sem coletor neste contexto — fica só a primeira página.
  }
  await safe(() => ctx.resources.messages.clearReactions(ctx.channelID, id, tag));
}
