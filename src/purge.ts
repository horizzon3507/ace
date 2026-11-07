import type { AceContext } from './context.js';
import { emoji as bundledEmoji } from './emoji.js';
import { resolveTarget } from './resolve.js';

export type PurgeMode = 'channel' | 'user';

export type PurgeDeps = {
  emoji: { unhappy: string; purge: string };
};

/** Fecha sobre os emojis desta carga. O import estático fica no cache do Node. */
export function bindPurge(deps: PurgeDeps) {
  const { emoji } = deps;

  return async function runPurge(ctx: AceContext, mode: PurgeMode): Promise<void> {
    const guildID = ctx.requireGuild();
    let n: number;
    let label: string | undefined;
    let ids: string[] | undefined;

    if (mode === 'user') {
      const target = await resolveTarget(ctx, guildID, ctx.tokens);
      if (target.status === 'none') {
        await ctx.reply(`${emoji.unhappy} Por favor, me informe o membro cujas mensagens apagar!\n-# ╰ Ex: \`a.purge @usuario 10\``);
        return;
      }
      if (target.status === 'missing') {
        await ctx.reply(`${emoji.unhappy} Eu não encontrei ninguém como ${target.query}... Use menção ou ID de usuário.`);
        return;
      }
      if (target.status === 'ambiguous') {
        await ctx.reply(`${emoji.unhappy} Eu encontrei vários membros como ${target.query}... Use menção ou forneça o ID de usuário!`);
        return;
      }
      const parsed = ctx.tokens[1] === undefined ? 10 : amount(ctx.tokens[1]);
      if (parsed === undefined) {
        await ctx.reply(`${emoji.unhappy} Por favor, me informe quantas mensagens apagar (de 1 a 99)!\n-# ╰ Ex: \`a.purge @usuario 10\``);
        return;
      }
      n = parsed;
      label = target.label ?? target.id;
      const recent = await ctx.resources.messages.list(ctx.channelID, 100);
      ids = recent.filter((message) => message.authorID === target.id).slice(0, n).map((message) => message.id);
      // A listagem da API já traz a mensagem do comando; o prepend cobre o caso de ela faltar.
      const selfID = ctx.message.id;
      if (selfID && !ids.includes(selfID)) ids.unshift(selfID);
    } else {
      const parsed = amount(ctx.tokens[0]);
      if (parsed === undefined) {
        await ctx.reply(`${emoji.unhappy} Por favor, me informe quantas mensagens apagar (de 1 a 99)!\n-# ╰ Ex: \`a.clear 20\``);
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
      ids ??= (await ctx.resources.messages.list(ctx.channelID, n + 1)).map((message) => message.id);
      count = await removeEach(ctx, ids);
    }

    if (count === 0) {
      await ctx.reply(`${emoji.unhappy} Eu não encontrei mensagens para apagar...`);
      return;
    }
    const scope = mode === 'user' ? ` Só as de **${label}**` : '';
    await ctx.reply(`${emoji.purge} **${count} ${count === 1 ? 'mensagem apagada' : 'mensagens apagadas'}**!${scope}...`);
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

/** Apaga id a id contando só os sucessos — NOT_FOUND de mensagem já removida não derruba o restante. */
async function removeEach(ctx: AceContext, ids: readonly string[]): Promise<number> {
  let count = 0;
  for (const id of ids) {
    try {
      await ctx.transport.delete(ctx.channelID, id);
      count += 1;
    } catch { /* a mensagem já saiu do canal — segue para a próxima */ }
  }
  return count;
}
