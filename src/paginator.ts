import { EmbedBuilder } from '@fluxerjs/core';
import type { Embed } from 'yuzuha';
import type { AceContext } from './context.js';

// O coletor filtra e devolve votos pelo NOME do emoji, não pela tag.
const LEFT = 'arrowleftfill';
const RIGHT = 'arrowrightfill';
const HOME = 'home4fill';
const NAMES = [LEFT, RIGHT, HOME];
const DEFAULT_TIMEOUT_MS = 60_000;

const safe = <T>(fn: () => Promise<T>): Promise<T | null> => Promise.resolve().then(fn).catch(() => null);

type Button = { name: string; tag: string };

function buttons(ctx: AceContext): Record<string, Button> {
  return {
    [LEFT]: { name: LEFT, tag: ctx.emoji.arrowLeft ?? '<:arrowleftfill:1566639260100997120>' },
    [RIGHT]: { name: RIGHT, tag: ctx.emoji.arrowRight ?? '<:arrowrightfill:1566639126151700482>' },
    [HOME]: { name: HOME, tag: ctx.emoji.home ?? '<:home4fill:1570905409848344576>' },
  };
}

// Barra por página: ◀ volta, ▶ avança, home volta à primeira — sempre por último.
function barFor(page: number, total: number, all: Record<string, Button>): Button[] {
  return [
    ...(page > 0 ? [all[LEFT]] : []),
    ...(page < total - 1 ? [all[RIGHT]] : []),
    all[HOME],
  ];
}

const sameBar = (a: readonly Button[], b: readonly Button[]) =>
  a.length === b.length && a.every((button, i) => button.name === b[i]?.name);

// Embed da yuzuha usa iconURL: precisa do builder pra editar via Message nativa.
const media = (item: { url: string; description?: string }) =>
  item.description === undefined ? item.url : { url: item.url, description: item.description };

function toBuilder(e: Embed): EmbedBuilder {
  const b = new EmbedBuilder();
  if (e.url !== undefined) b.setURL(e.url);
  if (e.title !== undefined) b.setTitle(e.title);
  if (e.description !== undefined) b.setDescription(e.description);
  if (e.color !== undefined) b.setColor(e.color);
  if (e.timestamp !== undefined) b.setTimestamp(new Date(e.timestamp));
  if (e.author) {
    b.setAuthor({
      name: e.author.name,
      ...(e.author.url === undefined ? {} : { url: e.author.url }),
      ...(e.author.iconURL === undefined ? {} : { iconURL: e.author.iconURL }),
    });
  }
  if (e.fields) b.setFields(...e.fields);
  if (e.footer) {
    b.setFooter({
      text: e.footer.text,
      ...(e.footer.iconURL === undefined ? {} : { iconURL: e.footer.iconURL }),
    });
  }
  if (e.image) b.setImage(media(e.image));
  if (e.thumbnail) b.setThumbnail(media(e.thumbnail));
  return b;
}

/**
 * Operações sobre a mensagem do paginador. As portas (ctx.edit/react/messages)
 * fazem fetchMessage ANTES de cada chamada — REST a dobro. Com a Message
 * nativa resolvida uma única vez, cada operação é uma request só.
 */
async function makeOps(ctx: AceContext, id: string) {
  const msg = await safe(async () => {
    const client = ctx.client;
    if (!client?.isReady()) return null;
    const channel = await client.channels.resolve(ctx.channelID);
    if (!channel.isTextBased()) return null;
    return channel.messages.resolve(id);
  });
  if (!msg) {
    return {
      react: (tag: string) => ctx.react(tag, id),
      edit: (page: Embed) => ctx.edit(id, { embeds: [page] }),
      removeVote: (tag: string, userID: string) =>
        ctx.resources.messages.removeReaction(ctx.channelID, id, tag, userID),
      wipe: () => ctx.resources.messages.clearReactions(ctx.channelID, id),
    };
  }
  return {
    react: (tag: string) => msg.react(tag),
    edit: (page: Embed) => msg.edit({ embeds: [toBuilder(page)] }),
    removeVote: (tag: string, userID: string) => msg.removeReaction(tag, userID),
    wipe: () => msg.removeAllReactions(),
  };
}

type Ops = Awaited<ReturnType<typeof makeOps>>;

async function place(ops: Ops, bar: Button[]): Promise<void> {
  for (const button of bar) await safe(() => ops.react(button.tag));
}

/**
 * Paginador por reação: responde com a primeira página, arma a barra e devolve
 * o controle — os votos correm em background (se o run esperasse o coletor
 * morrer, o comando só logaria 'ok' depois de 60s). Cada escuta é um
 * awaitReaction novo: o ReactionCollector do SDK deduplica user+emoji, então
 * um coletor único engoliria todo clique depois do primeiro. Quando a barra
 * muda (entrada/saída de ponta) ela é refeita do zero; no miolo só o voto
 * do usuário sai, e só sobram as reações do bot.
 */
export async function startPaginator(ctx: AceContext, pages: readonly Embed[], timeoutMs = DEFAULT_TIMEOUT_MS): Promise<void> {
  if (pages.length === 0) return;
  const id = await ctx.reply({ embeds: [pages[0]] });
  if (pages.length < 2) return;
  const all = buttons(ctx);
  const ops = await makeOps(ctx, id);
  const bar = barFor(0, pages.length, all);
  await place(ops, bar);
  void watch(ctx, id, pages, all, ops, bar, timeoutMs);
}

async function watch(ctx: AceContext, id: string, pages: readonly Embed[], all: Record<string, Button>, ops: Ops, bar: Button[], timeoutMs: number): Promise<void> {
  let tail: Promise<unknown> = Promise.resolve();
  let page = 0;
  let currentBar = bar;
  const deadline = Date.now() + timeoutMs;
  const warn = (error: unknown) => console.warn('[paginador] flip falhou:', error);
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
      const userID = vote.userID;
      if (target === page) {
        // Clique que não muda de página (ex.: home já na primeira): some só o voto.
        tail = tail.then(() => safe(() => ops.removeVote(clicked.tag, userID)));
        continue;
      }
      const embed = pages[target];
      const nextBar = barFor(target, pages.length, all);
      const unchanged = sameBar(currentBar, nextBar);
      page = target;
      currentBar = nextBar;
      // flip enfileirado atrás do anterior: a próxima escuta já arma sem
      // esperar o REST, e os edits nunca saem de ordem.
      tail = tail.then(async () => {
        if (unchanged) {
          // Miolo: só vira a página e some o voto — barra já está certa.
          for (const result of await Promise.allSettled([
            ops.edit(embed),
            ops.removeVote(clicked.tag, userID),
          ])) {
            if (result.status === 'rejected') warn(result.reason);
          }
          return;
        }
        const [editResult] = await Promise.allSettled([ops.edit(embed), ops.wipe()]);
        await place(ops, nextBar);
        if (editResult?.status === 'rejected') warn(editResult.reason);
      });
    }
  } finally {
    await tail;
    await safe(() => ops.wipe());
  }
}
