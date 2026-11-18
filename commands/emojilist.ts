import { defineCommand } from 'yuzuha';
import { replyEmojiList } from '../src/live.js';

export default defineCommand({
  name: 'emojilist',
  description: 'Lista os emojis do servidor com nome e menção.',
  aliases: Object.freeze(['emojis', 'listaremojis', 'elist', 'emojislist']) as string[],
  guildOnly: true,
  cooldown: 5_000,
  examples: Object.freeze(['emojilist']) as string[],
  run: (ctx) => replyEmojiList(ctx),
});
