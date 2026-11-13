import { EmbedBuilder, Message, ReactionCollector } from '@fluxerjs/core';
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

type Ops = {
  react(tag: string): Promise<unknown>;
  edit(page: Embed): Promise<unknown>;
  removeVote(tag: string, userID: string): Promise<unknown>;
  wipe(): Promise<unknown>;
};

// Cada método da Message nativa é uma request só — sem fetchMessage prévio.
const nativeOps = (msg: Message): Ops => ({
  react: (tag) => msg.react(tag),
  edit: (page) => msg.edit({ embeds: [toBuilder(page)] }),
  removeVote: (tag, userID) => msg.removeReaction(tag, userID),
  wipe: () => msg.removeAllReactions(),
});

/**
 * Fallback das portas pra quando a Message nativa não está acessível (testes).
 * Tenta resolver a nativa uma vez; se der, volta a custar uma request por op.
 */
async function makeOps(ctx: AceContext, id: string): Promise<Ops> {
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
  return nativeOps(msg);
}

type Vote = { emoji: string; userID: string };
type VoteSource = { next(): Promise<Vote | null>; close(): void };

/**
 * Um ReactionCollector único pra sessão inteira: o dedup dele por user+emoji
 * vive em `collected` — soltar a chave no handler deixa o mesmo clique valer
 * de novo. Sem collector novo nem listeners rearmados a cada voto.
 */
function nativeVotes(msg: Message, authorID: string, timeoutMs: number): VoteSource {
  const wanted = new Set(NAMES);
  const queue: (Vote | null)[] = [];
  let wake: (() => void) | undefined;
  const collector = new ReactionCollector(msg.client, msg.id, msg.channelId, {
    time: timeoutMs,
    filter: (reaction, user) =>
      user.id === authorID && wanted.has(reaction.emoji.name.toLowerCase()),
  });
  const push = (vote: Vote | null) => {
    queue.push(vote);
    const notify = wake;
    wake = undefined;
    notify?.();
  };
  collector.on('collect', (reaction, user) => {
    collector.collected.delete(`${user.id}:${reaction.emoji.id ?? reaction.emoji.name}`);
    push({ emoji: reaction.emoji.name.toLowerCase(), userID: user.id });
  });
  collector.on('end', () => push(null));
  return {
    next() {
      const vote = queue.shift();
      if (vote !== undefined) return Promise.resolve(vote);
      return new Promise<Vote | null>((resolve) => {
        wake = () => {
          wake = undefined;
          resolve(queue.shift() ?? null);
        };
      });
    },
    close: () => collector.stop('user'),
  };
}

// Sem client: awaitReaction por clique — coletor novo zera o dedup do SDK.
function portVotes(ctx: AceContext, id: string, deadline: number): VoteSource {
  return {
    next() {
      const remaining = deadline - Date.now();
      if (remaining <= 0) return Promise.resolve(null);
      return safe(() =>
        ctx.resources.collectors.awaitReaction(ctx.channelID, id, NAMES, remaining, ctx.authorID));
    },
    close() {},
  };
}

async function place(ops: Ops, bar: Button[]): Promise<void> {
  for (const button of bar) await safe(() => ops.react(button.tag));
}

/**
 * Paginador por reação: responde com a primeira página, arma a barra e devolve
 * o controle — os votos correm em background (se o run esperasse o coletor
 * morrer, o comando só logaria 'ok' depois de 60s). Quando a barra muda
 * (entrada/saída de ponta) ela é refeita do zero; no miolo só o voto do
 * usuário sai, e só sobram as reações do bot.
 */
export async function startPaginator(ctx: AceContext, pages: readonly Embed[], timeoutMs = DEFAULT_TIMEOUT_MS): Promise<void> {
  if (pages.length === 0) return;
  const all = buttons(ctx);
  const bar = barFor(0, pages.length, all);

  // Caminho quente: o raw da mensagem do comando já é a Message nativa — o
  // reply devolve a Message do paginador na MESMA request, sem resolve de
  // canal nem de mensagem. A barra monta em background e vira o tail inicial
  // da fila: nenhum flip corre na frente da montagem.
  const raw = ctx.message?.raw;
  const sent = raw instanceof Message
    ? await safe(() => raw.reply({ embeds: [toBuilder(pages[0])] }, { ping: false }))
    : null;

  if (sent) {
    if (pages.length < 2) return;
    const ops = nativeOps(sent);
    void watch(pages, all, ops, bar, nativeVotes(sent, ctx.authorID, timeoutMs), place(ops, bar));
    return;
  }

  const id = await ctx.reply({ embeds: [pages[0]] });
  if (pages.length < 2) return;
  const ops = await makeOps(ctx, id);
  await place(ops, bar);
  void watch(pages, all, ops, bar, portVotes(ctx, id, Date.now() + timeoutMs), Promise.resolve());
}

async function watch(
  pages: readonly Embed[],
  all: Record<string, Button>,
  ops: Ops,
  bar: Button[],
  source: VoteSource,
  initialTail: Promise<unknown>,
): Promise<void> {
  let tail = initialTail;
  let page = 0;
  let currentBar = bar;
  const warn = (error: unknown) => console.warn('[paginador] flip falhou:', error);
  try {
    for (;;) {
      const vote = await source.next();
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
    source.close();
    await tail;
    await safe(() => ops.wipe());
  }
}
