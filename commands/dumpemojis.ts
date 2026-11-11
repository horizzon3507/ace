import { defineCommand } from 'yuzuha';
import { replyEmojiDump } from '../src/live.js';

export default defineCommand({
  name: 'dumpemojis',
  description: 'Lista os emojis do servidor e empacota todos em um zip.',
  aliases: ['emojis', 'emojidump', 'emojisdump', 'listaremojis', 'exportaremojis', 'emojilist'],
  guildOnly: true,
  cooldown: '10s',
  examples: ['a.dumpemojis', 'a.dumpemojis 2'],
  run: (ctx) => replyEmojiDump(ctx),
});
