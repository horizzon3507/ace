import { defineCommand } from 'yuzuha';
import { replyEmojiList } from '../src/live.js';

export default defineCommand({
  name: 'emojilist',
  description: 'Lista os emojis do servidor com nome e menção.',
  aliases: ['emojis', 'listaremojis', 'elist', 'emojislist'],
  guildOnly: true,
  cooldown: '5s',
  run: (ctx) => replyEmojiList(ctx),
});
