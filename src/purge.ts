import type { AceContext } from './context.js';
import { emoji as bundledEmoji } from './emoji.js';
import { resolveTarget } from './resolve.js';

export type PurgeMode = 'channel' | 'user';

export type PurgeDeps = {
  emoji: { unhappy: string; purge: string };
  after?: (ms: number, fn: () => void) => void;
  wait?: (ms: number) => Promise<void>;
};

const REPLY_TTL_MS = 7_000;
const RETRY_DELAY_MS = 750;

/** setTimeout real com unref — não segura o processo se o bot cair antes dos 7s. */
function later(ms: number, fn: () => void): void {
  setTimeout(fn, ms).unref();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Só erro de transporte (fetch failed, socket reset) merece retentativa — o REST do
 * SDK não retenta POST/DELETE. 404 e erros de API passam direto, sem espera.
 */
function transient(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (!(error instanceof Error)) return false;
  const cause = (error as { cause?: unknown }).cause;
  const text = cause instanceof Error ? `${error.message} ${cause.message}` : error.message;
  return /fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|UND_ERR/i.test(text);
}

/** Fecha sobre os emojis desta carga. O import estático fica no cache do Node. */
export function bindPurge(deps: PurgeDeps) {
  const { emoji, after = later, wait = sleep } = deps;

  const call = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      if (!transient(error)) throw error;
      await wait(RETRY_DELAY_MS);
      return fn();
    }
  };

  return async function runPurge(ctx: AceContext, mode: PurgeMode): Promise<void> {
    const guildID = ctx.requireGuild();
    const selfID = ctx.message.id;
    let n: number;
    let label: string | undefined;
    let ids: string[] | undefined;

    if (mode === 'user') {
      // A menção vale em qualquer posição (`a.purge 2 @user` ≡ `a.purge @user 2`).
      const mention = ctx.tokens.find((token) => /^<@!?\d+>$/.test(token));
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
      label = target.label ?? (await nameOf(ctx, guildID, target.id));
      const recent = await ctx.resources.messages.list(ctx.channelID, 100);
      ids = recent.filter((message) => message.authorID === target.id && message.id !== selfID).slice(0, n).map((message) => message.id);
    } else {
      const parsed = amount(ctx.tokens[0]);
      if (parsed === undefined) {
        await ctx.reply(`${emoji.unhappy} Por favor, me informe quantas mensagens apagar (de 1 a 99)...\n-# ╰ Ex: \`a.clear 20\``);
        return;
      }
      n = parsed;
    }

    // Só o modo canal tem atalho nativo: bulkDelete(n + 1) busca e apaga as
    // últimas n + 1 numa chamada, já cobrindo a mensagem do comando.
    let count: number;
    if (mode === 'channel' && (await bulkDelete(ctx, n + 1))) {
      count = n;
    } else {
      ids ??= (await ctx.resources.messages.list(ctx.channelID, n + 1))
        .map((message) => message.id)
        .filter((id) => id !== selfID)
        .slice(0, n);
      count = await removeEach(ids, (id) => call(() => ctx.transport.delete(ctx.channelID, id)));
      // A mensagem do comando sai junto, mas fora da conta — o total é só do alvo.
      if (selfID) await call(() => ctx.transport.delete(ctx.channelID, selfID)).catch(() => {});
    }

    // A deleção cobre a mensagem do comando: responder com reply referenciaria
    // um id morto (404). A resposta vai como send puro, sem referência.
    if (count === 0) {
      await call(() => ctx.send(`${emoji.unhappy} Eu não encontrei mensagens para apagar...`));
      return;
    }
    const scope = mode === 'user' ? `de @${label}` : 'deste canal';
    const sent = await call(() => ctx.send(`${emoji.purge} Eu apaguei **${count} ${count === 1 ? 'mensagem' : 'mensagens'}** ${scope}!`));
    after(REPLY_TTL_MS, () => {
      void call(() => ctx.transport.delete(ctx.channelID, sent)).catch(() => { /* já foi apagada por outra via */ });
    });
  };
}

export const runPurge = bindPurge({ emoji: bundledEmoji });

/** Inteiro decimal de 1 a 99; ausente, não numérico ou fora da faixa viram undefined. */
function amount(raw: string | undefined): number | undefined {
  if (raw === undefined || !/^\d+$/.test(raw)) return undefined;
  const n = Number.parseInt(raw, 10);
  return n >= 1 && n <= 99 ? n : undefined;
}

/** Apaga as últimas `limit` mensagens pelo client nativo; false sem client (testes) ou se a rota falhar. */
async function bulkDelete(ctx: AceContext, limit: number): Promise<boolean> {
  try {
    const channel = await ctx.client.channels.resolve(ctx.channelID);
    await channel.bulkDelete(limit);
    return true;
  } catch {
    return false;
  }
}

/** Menção e ID não trazem nome — resolve o membro para exibir @nome em vez do snowflake cru. */
async function nameOf(ctx: AceContext, guildID: string, userID: string): Promise<string> {
  try {
    const member = await ctx.resources.users.member(guildID, userID);
    return member.nickname ?? member.displayName ?? member.username ?? userID;
  } catch {
    return userID;
  }
}

/** Apaga id a id contando só os sucessos — NOT_FOUND de mensagem já removida não derruba o restante. */
async function removeEach(ids: readonly string[], del: (id: string) => Promise<void>): Promise<number> {
  let count = 0;
  for (const id of ids) {
    try {
      await del(id);
      count += 1;
    } catch { /* a mensagem já saiu do canal — segue para a próxima */ }
  }
  return count;
}
