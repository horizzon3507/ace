import type { Embed } from 'yuzuha';
import type { AceContext } from './context.js';

const PREV = '⬅️';
const NEXT = '➡️';
const DEFAULT_TIMEOUT_MS = 60_000;

const safe = <T>(fn: () => Promise<T>): Promise<T | null> => Promise.resolve().then(fn).catch(() => null);

/**
 * Paginador por reação: responde com a primeira página, reage ⬅️/➡️ e escuta
 * os votos do autor pelo coletor nativo. A reação do autor sai a cada flip pra
 * poder clicar de novo; no fim as setas do bot são limpas.
 */
export async function startPaginator(ctx: AceContext, pages: readonly Embed[], timeoutMs = DEFAULT_TIMEOUT_MS): Promise<void> {
  if (pages.length === 0) return;
  const id = await ctx.reply({ embeds: [pages[0]] });
  if (pages.length < 2) return;
  let page = 0;
  await Promise.allSettled([ctx.react(PREV, id), ctx.react(NEXT, id)]);
  try {
    const votes = ctx.resources.collectors.collectReactions(ctx.channelID, {
      messageID: id,
      emojis: [PREV, NEXT],
      userID: ctx.authorID,
      timeMs: timeoutMs,
    });
    for await (const vote of votes) {
      page = vote.emoji === NEXT ? (page + 1) % pages.length : (page - 1 + pages.length) % pages.length;
      await safe(() => ctx.edit(id, { embeds: [pages[page]] }));
      await safe(() => ctx.resources.messages.removeReaction(ctx.channelID, id, vote.emoji, vote.userID));
    }
  } catch {
    // Sem coletor neste contexto — fica só a primeira página.
  }
  await safe(() => ctx.resources.messages.clearReactions(ctx.channelID, id, PREV));
  await safe(() => ctx.resources.messages.clearReactions(ctx.channelID, id, NEXT));
}
