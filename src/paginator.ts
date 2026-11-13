import type { Embed } from 'yuzuha';
import type { AceContext } from './context.js';

// Seta única: <:arrowrightfill:…> = próxima página (wrap no fim). O coletor
// filtra e devolve votos pelo NOME do emoji, não pela tag.
const ARROW_NAME = 'arrowrightfill';
const DEFAULT_TIMEOUT_MS = 60_000;

const safe = <T>(fn: () => Promise<T>): Promise<T | null> => Promise.resolve().then(fn).catch(() => null);

/**
 * Paginador por reação: responde com a primeira página, reage a seta custom e
 * devolve o controle — os votos correm em background (se o run esperasse o
 * coletor morrer, o comando só logaria 'ok' depois de 60s). Cada escuta é um
 * awaitReaction novo: o ReactionCollector do SDK deduplica user+emoji, então
 * um coletor único engoliria todo clique depois do primeiro.
 */
export async function startPaginator(ctx: AceContext, pages: readonly Embed[], timeoutMs = DEFAULT_TIMEOUT_MS): Promise<void> {
  if (pages.length === 0) return;
  const id = await ctx.reply({ embeds: [pages[0]] });
  if (pages.length < 2) return;
  const tag = ctx.emoji.arrowRight ?? `<:${ARROW_NAME}:1566639126151700482>`;
  await safe(() => ctx.react(tag, id));
  void watch(ctx, id, pages, tag, timeoutMs);
}

async function watch(ctx: AceContext, id: string, pages: readonly Embed[], tag: string, timeoutMs: number): Promise<void> {
  let tail: Promise<unknown> = Promise.resolve();
  let page = 0;
  const deadline = Date.now() + timeoutMs;
  try {
    for (;;) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      const vote = await safe(() =>
        ctx.resources.collectors.awaitReaction(ctx.channelID, id, ARROW_NAME, remaining, ctx.authorID));
      if (!vote) break;
      page = (page + 1) % pages.length;
      const embed = pages[page];
      const userID = vote.userID;
      // flip e limpeza enfileirados atrás do anterior: a próxima escuta já
      // arma sem esperar o REST, e os edits nunca saem de ordem.
      tail = tail.then(() => Promise.allSettled([
        ctx.edit(id, { embeds: [embed] }),
        ctx.resources.messages.removeReaction(ctx.channelID, id, tag, userID),
      ])).then((settled) => {
        const failed = settled?.find((r) => r.status === 'rejected');
        if (failed) console.warn('[paginador] flip falhou:', failed.reason);
      });
    }
  } finally {
    await tail;
    await safe(() => ctx.resources.messages.clearReactions(ctx.channelID, id, tag));
  }
}
