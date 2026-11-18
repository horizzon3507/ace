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

const TEXT_ENCODER = new TextEncoder();

/** Zip STORE, sem compressão — emoji já vem comprimido (PNG, GIF, WebP). */
export function buildZip(entries: readonly ZipEntry[]): Uint8Array {
  const prepared: { nameBytes: Uint8Array; data: Uint8Array; crc: number; offset: number }[] = new Array(entries.length);
  let bodySize = 0;
  let centralSize = 0;
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i]!;
    const nameBytes = TEXT_ENCODER.encode(entry.name);
    const crc = crc32(entry.data);
    prepared[i] = { nameBytes, data: entry.data, crc, offset: bodySize };
    bodySize += 30 + nameBytes.length + entry.data.length;
    centralSize += 46 + nameBytes.length;
  }

  const out = new Uint8Array(bodySize + centralSize + 22);
  const view = new DataView(out.buffer);
  let centralCursor = bodySize;
  for (let i = 0; i < prepared.length; i += 1) {
    const { nameBytes, data, crc, offset } = prepared[i]!;
    view.setUint32(offset, 0x04034b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 0x0800, true); // nomes em UTF-8
    view.setUint16(offset + 8, 0, true); // STORE
    view.setUint16(offset + 12, 33, true); // 1980-01-01
    view.setUint32(offset + 14, crc, true);
    view.setUint32(offset + 18, data.length, true);
    view.setUint32(offset + 22, data.length, true);
    view.setUint16(offset + 26, nameBytes.length, true);
    out.set(nameBytes, offset + 30);
    out.set(data, offset + 30 + nameBytes.length);

    view.setUint32(centralCursor, 0x02014b50, true);
    view.setUint16(centralCursor + 4, 20, true);
    view.setUint16(centralCursor + 6, 20, true);
    view.setUint16(centralCursor + 8, 0x0800, true);
    view.setUint16(centralCursor + 14, 33, true);
    view.setUint32(centralCursor + 16, crc, true);
    view.setUint32(centralCursor + 20, data.length, true);
    view.setUint32(centralCursor + 24, data.length, true);
    view.setUint16(centralCursor + 28, nameBytes.length, true);
    view.setUint32(centralCursor + 42, offset, true);
    out.set(nameBytes, centralCursor + 46);
    centralCursor += 46 + nameBytes.length;
  }

  view.setUint32(centralCursor, 0x06054b50, true);
  view.setUint16(centralCursor + 8, entries.length, true);
  view.setUint16(centralCursor + 10, entries.length, true);
  view.setUint32(centralCursor + 12, centralSize, true);
  view.setUint32(centralCursor + 16, bodySize, true);
  return out;
}

const EXT_RE = /\.(png|gif|webp|apng|jpe?g)(?:[?#]|$)/i;
const ANIMATED_PNG_RE = /\/(a_[^/.]+)\.png(\?|$)/;
const SAFE_NAME_RE = /[^\w.-]+/g;
const DIACRITICS_RE = /[\u0300-\u036f]/g;
const NON_ALNUM_RE = /[^a-z0-9]+/g;
const TRIM_DASH_RE = /^-+|-+$/g;

const tag = (item: EmojiInfo) => `<${item.animated ? 'a' : ''}:${item.name}:${item.id}>`;
const extOf = (item: EmojiInfo): string =>
  item.url?.match(EXT_RE)?.[1]?.toLowerCase() ?? (item.animated ? 'gif' : 'png');

// Mesma regra do fixAnimatedAssetUrl da yuzuha: hash a_* em .png aponta pro .gif.
const fixGif = (url?: string | null) => url?.replace(ANIMATED_PNG_RE, '/$1.gif$2') ?? null;

export const compareSnowflakeDesc = (a: string, b: string): number =>
  a.length !== b.length ? b.length - a.length : b > a ? 1 : b < a ? -1 : 0;

const fetchEmojis = async (ctx: AceContext, guildID: string) => {
  const [guild, emojis] = await Promise.all([
    safe(async () => {
      // guilds.resolve bate no cache do gateway: nome+ícone sem REST extra.
      // A porta (users.guild) sempre faz fetch force — só serve de fallback.
      const client = ctx.client;
      if (client?.isReady()) {
        const g = await client.guilds.resolve(guildID);
        return { name: g.name, iconURL: fixGif(g.iconURL()) };
      }
      const info = await ctx.resources.users.guild(guildID);
      return info ? { name: info.name, iconURL: info.iconURL } : null;
    }),
    safe(() => ctx.resources.expressions.emojis(guildID)),
  ]);
  // Recentes primeiro — snowflake cresce com o tempo, ordem desc por id.
  emojis?.sort((a, b) => compareSnowflakeDesc(a.id, b.id));
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
    const base = item.name.replace(SAFE_NAME_RE, '_').slice(0, 60) || 'emoji';
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
    .replace(DIACRITICS_RE, '')
    .replace(NON_ALNUM_RE, '-')
    .replace(TRIM_DASH_RE, '') || 'servidor';
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
