import type { Embed } from 'yuzuha';
import type { AceContext } from './context.js';

// O coletor filtra e devolve votos pelo NOME do emoji, não pela tag.
const LEFT = 'arrowleftfill';
const RIGHT = 'arrowrightfill';
const HOME = 'ace';
const NAMES = [LEFT, RIGHT, HOME];
const DEFAULT_TIMEOUT_MS = 60_000;

const safe = <T>(fn: () => Promise<T>): Promise<T | null> => Promise.resolve().then(fn).catch(() => null);

type Button = { name: string; tag: string };

function buttons(ctx: AceContext): Record<string, Button> {
  return {
    [LEFT]: { name: LEFT, tag: ctx.emoji.arrowLeft ?? '<:arrowleftfill:1566639260100997120>' },
    [RIGHT]: { name: RIGHT, tag: ctx.emoji.arrowRight ?? '<:arrowrightfill:1566639126151700482>' },
    [HOME]: { name: HOME, tag: ctx.emoji.home ?? '<:ace:1566575966614990848>' },
  };
}

// Barra por página: ◀ volta, ▶ avança, ace volta à primeira — sempre por último.
function barFor(page: number, total: number, all: Record<string, Button>): Button[] {
  return [
    ...(page > 0 ? [all[LEFT]] : []),
    ...(page < total - 1 ? [all[RIGHT]] : []),
    all[HOME],
  ];
}

async function place(ctx: AceContext, id: string, bar: Button[]): Promise<void> {
  for (const button of bar) await safe(() => ctx.react(button.tag, id));
}

/**
 * Paginador por reação: responde com a primeira página, arma a barra e devolve
 * o controle — os votos correm em background (se o run esperasse o coletor
 * morrer, o comando só logaria 'ok' depois de 60s). Cada escuta é um
 * awaitReaction novo: o ReactionCollector do SDK deduplica user+emoji, então
 * um coletor único engoliria todo clique depois do primeiro. A cada flip a
 * barra é refeita do zero, então só restam as reações do bot.
 */
export async function startPaginator(ctx: AceContext, pages: readonly Embed[], timeoutMs = DEFAULT_TIMEOUT_MS): Promise<void> {
  if (pages.length === 0) return;
  const id = await ctx.reply({ embeds: [pages[0]] });
  if (pages.length < 2) return;
  const all = buttons(ctx);
  await place(ctx, id, barFor(0, pages.length, all));
  void watch(ctx, id, pages, all, timeoutMs);
}

async function watch(ctx: AceContext, id: string, pages: readonly Embed[], all: Record<string, Button>, timeoutMs: number): Promise<void> {
  let tail: Promise<unknown> = Promise.resolve();
  let page = 0;
  const deadline = Date.now() + timeoutMs;
  try {
    for (;;) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      const vote = await safe(() =>
        ctx.resources.collectors.awaitReaction(ctx.channelID, id, NAMES, remaining, ctx.authorID));
      if (!vote) break;
      const clicked = all[vote.emoji];
      if (!clicked) continue;
      const target = clicked.name === LEFT ? Math.max(0, page - 1)
        : clicked.name === RIGHT ? Math.min(pages.length - 1, page + 1)
        : 0;
      if (target === page) {
        // Clique que não muda de página (ex.: home já na primeira): some só o voto.
        tail = tail.then(() => safe(() =>
          ctx.resources.messages.removeReaction(ctx.channelID, id, clicked.tag, vote.userID)));
        continue;
      }
      page = target;
      const embed = pages[page];
      const bar = barFor(page, pages.length, all);
      // flip enfileirado atrás do anterior: a próxima escuta já arma sem
      // esperar o REST, e os edits nunca saem de ordem.
      tail = tail.then(async () => {
        const [editResult] = await Promise.allSettled([
          ctx.edit(id, { embeds: [embed] }),
          ctx.resources.messages.clearReactions(ctx.channelID, id),
        ]);
        await place(ctx, id, bar);
        if (editResult.status === 'rejected') console.warn('[paginador] flip falhou:', editResult.reason);
      });
    }
  } finally {
    await tail;
    await safe(() => ctx.resources.messages.clearReactions(ctx.channelID, id));
  }
}
