import { defineCommand } from 'yuzuha';
import { replyEmojiIdDrop } from '../src/live.js';

export default defineCommand({
  name: 'iddrop',
  description: 'Dropa todos os emojis do servidor em linha, separados por vírgula.',
  aliases: ['emojidrop', 'dropids', 'drop'],
  guildOnly: true,
  cooldown: '5s',
  run: (ctx) => replyEmojiIdDrop(ctx),
});
