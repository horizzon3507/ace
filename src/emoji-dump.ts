import { embed, type Embed, type EmojiInfo } from 'yuzuha';
import { AttachmentBuilder } from '@fluxerjs/core';
import type { AceContext } from './context.js';
import { brand, startPaginator } from './live.js';

const PAGE_SIZE = 15;
const DOWNLOAD_BATCH = 8;
const safe = <T>(fn: () => Promise<T>): Promise<T | null> => Promise.resolve().then(fn).catch(() => null);
const noun = (n: number, singular: string, plural = `${singular}s`) => n === 1 ? singular : plural;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (data: Uint8Array): number => {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/** Zip STORE, sem compressão — emoji já vem comprimido (PNG, GIF, WebP). */
export function buildZip(entries: readonly ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const body: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // nomes em UTF-8
    local.setUint16(8, 0, true); // STORE
    local.setUint16(12, 33, true); // 1980-01-01
    local.setUint32(14, crc, true);
    local.setUint32(18, entry.data.length, true);
    local.setUint32(22, entry.data.length, true);
    local.setUint16(26, nameBytes.length, true);
    body.push(new Uint8Array(local.buffer), nameBytes, entry.data);

    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(4, 20, true);
    dir.setUint16(6, 20, true);
    dir.setUint16(8, 0x0800, true);
    dir.setUint16(14, 33, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, entry.data.length, true);
    dir.setUint32(24, entry.data.length, true);
    dir.setUint16(28, nameBytes.length, true);
    dir.setUint32(42, offset, true);
    central.push(new Uint8Array(dir.buffer), nameBytes);
    offset += 30 + nameBytes.length + entry.data.length;
  }
  const centralOffset = offset;
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, centralOffset, true);
  const out = new Uint8Array(offset + centralSize + 22);
  let cursor = 0;
  for (const part of [...body, ...central, new Uint8Array(end.buffer)]) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}

const tag = (item: EmojiInfo) => `<${item.animated ? 'a' : ''}:${item.name}:${item.id}>`;
const extOf = (item: EmojiInfo): string =>
  item.url?.match(/\.(png|gif|webp|apng|jpe?g)(?:[?#]|$)/i)?.[1]?.toLowerCase() ?? (item.animated ? 'gif' : 'png');

const fetchEmojis = async (ctx: AceContext, guildID: string) => {
  const [guild, emojis] = await Promise.all([
    safe(() => ctx.resources.users.guild(guildID)),
    safe(() => ctx.resources.expressions.emojis(guildID)),
  ]);
  // Recentes primeiro — snowflake cresce com o tempo, ordem desc por id.
  emojis?.sort((a, b) => (BigInt(b.id) > BigInt(a.id) ? 1 : BigInt(b.id) < BigInt(a.id) ? -1 : 0));
  return { guild, emojis };
};

/** Lista os emojis do servidor, 15 por página, navegável por reação. */
export async function replyEmojiList(ctx: AceContext): Promise<void> {
  const { emoji } = ctx;
  const guildID = ctx.requireGuild();
  const { guild, emojis } = await fetchEmojis(ctx, guildID);
  if (!emojis || emojis.length === 0) {
    await ctx.reply(`${emoji.unhappy} Este servidor não tem emojis para eu listar...`);
    return;
  }
  const total = emojis.length;
  const count = Math.ceil(total / PAGE_SIZE);
  const pages: Embed[] = [];
  for (let i = 0; i < count; i += 1) {
    const lines = emojis
      .slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE)
      .map((item) => `${tag(item)} \`${tag(item)}\``);
    pages.push(embed({
      color: brand.background,
      author: { name: `Emojis de ${guild?.name ?? 'este servidor'}`, iconURL: guild?.iconURL ?? undefined },
      description: lines.join('\n'),
      footer: { text: count > 1 ? `Página ${i + 1} de ${count} — ${total} ${noun(total, 'emoji', 'emojis')} no total` : `${total} ${noun(total, 'emoji', 'emojis')} no total` },
    }));
  }
  await startPaginator(ctx, pages);
}

/** Todos os emojis em linha reta, separados por vírgula — drop rápido pra cópia. */
export async function replyEmojiIdDrop(ctx: AceContext): Promise<void> {
  const { emoji } = ctx;
  const guildID = ctx.requireGuild();
  const { emojis } = await fetchEmojis(ctx, guildID);
  if (!emojis || emojis.length === 0) {
    await ctx.reply(`${emoji.unhappy} Este servidor não tem emojis para eu dropar...`);
    return;
  }
  let line = '';
  for (const item of emojis) {
    const next = line ? `${line},${tag(item)}` : tag(item);
    if (next.length > 1900) {
      await ctx.send(line);
      line = tag(item);
    } else {
      line = next;
    }
  }
  if (line) await ctx.send(line);
}

/** Responde "espere" na hora, empacota o zip e edita a mesma mensagem com o anexo. */
export async function replyEmojiDump(ctx: AceContext): Promise<void> {
  const { emoji } = ctx;
  const guildID = ctx.requireGuild();
  const waiting = await ctx.reply(`${emoji.time} Me dê um momento! Estou empacotando os emojis deste servidor...`);
  const { guild, emojis } = await fetchEmojis(ctx, guildID);
  if (!emojis || emojis.length === 0) {
    await ctx.edit(waiting, `${emoji.unhappy} Este servidor não tem emojis para eu empacotar...`);
    return;
  }
  const downloadable = emojis.filter((item) => item.url);
  const taken = new Map<string, number>();
  const nameOf = (item: EmojiInfo): string => {
    const base = item.name.replace(/[^\w.-]+/g, '_').slice(0, 60) || 'emoji';
    const seen = (taken.get(base) ?? 0) + 1;
    taken.set(base, seen);
    return seen === 1 ? `${base}.${extOf(item)}` : `${base}-${seen}.${extOf(item)}`;
  };
  // ctx.http lança quando o serviço não veio no contexto — sonda com try.
  const http = (() => { try { return ctx.http; } catch { return undefined; } })();
  const entries: ZipEntry[] = [];
  if (http) {
    for (let i = 0; i < downloadable.length; i += DOWNLOAD_BATCH) {
      const batch = await Promise.all(downloadable.slice(i, i + DOWNLOAD_BATCH).map(async (item) => {
        const response = await safe(() => http.requestBytes({ method: 'GET', url: item.url! }));
        return response?.ok ? { name: nameOf(item), data: response.body } : null;
      }));
      for (const entry of batch) if (entry) entries.push(entry);
    }
  }
  if (entries.length === 0) {
    await ctx.edit(waiting, `${emoji.unhappy} Eu não consegui baixar os arquivos deste servidor para empacotar...`);
    return;
  }
  const slug = (guild?.name ?? 'servidor')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'servidor';
  const filename = `emojis-${slug}.zip`;
  const zip = buildZip(entries);
  const missing = downloadable.length - entries.length;
  const done = `${emoji.happy} Empacotei **${entries.length}** ${noun(entries.length, 'emoji', 'emojis')} em \`${filename}\`!${missing > 0 ? ` ${missing} ficaram de fora por falha no download...` : ''}`;
  // Anexo na própria mensagem: upload presignado + edit via client nativo.
  // Confere o anexo de volta — um PATCH que ignora upload_filename não pode
  // contar como sucesso, senão o zip some sem deixar rastro.
  let nativeError: unknown;
  const edited = await (async () => {
    try {
      const client = ctx.client;
      if (!client?.isReady()) throw new Error('client não está pronto');
      const channel = await client.channels.resolve(ctx.channelID);
      if (!channel.isTextBased()) throw new Error('canal sem texto');
      const uploaded = await channel.uploadAttachmentsForSend([{ id: 0, filename, data: zip, contentType: 'application/zip' }]);
      const message = await channel.messages.resolve(waiting);
      const updated = await message.edit({ content: done, attachments: uploaded.map((item) => ({ id: item.id, uploadFilename: item.upload_filename, filename: item.filename })) });
      if (updated.attachments.size > 0) return true;
      throw new Error('edição não anexou o arquivo');
    } catch (error) {
      nativeError = error;
      return false;
    }
  })();
  if (edited) return;
  const nativeCode = (nativeError as { code?: string } | undefined)?.code;
  if (nativeError && nativeCode !== 'NATIVE_UNAVAILABLE') {
    console.warn('[emojidump] anexo na mensagem falhou, caindo pro envio separado:', nativeError);
  }
  // Sem anexo na própria mensagem: edita o texto e manda o zip como reply.
  await ctx.edit(waiting, done);
  const replied = await safe(async () => {
    const client = ctx.client;
    if (!client?.isReady()) throw new Error('client não está pronto');
    const channel = await client.channels.resolve(ctx.channelID);
    if (!channel.isTextBased()) throw new Error('canal sem texto');
    const file = new AttachmentBuilder(Buffer.from(zip), { name: filename });
    await channel.send({ files: [file], replyTo: { channelId: ctx.channelID, messageId: waiting } });
  });
  if (!replied && ctx.sendStream) {
    await ctx.sendStream(new ReadableStream({ start(controller) { controller.enqueue(zip); controller.close(); } }), { name: filename });
  }
}
