import { defineCommand } from 'yuzuha';
import { replyEmojiDump } from '../src/live.js';

export default defineCommand({
  name: 'emojidump',
  description: 'Empacota todos os emojis do servidor em um zip.',
  aliases: ['dumpemojis', 'exportaremojis', 'emojisdump', 'emojizip', 'zipemojis'],
  guildOnly: true,
  cooldown: 10_000,
  examples: ['emojidump'],
  run: (ctx) => replyEmojiDump(ctx),
});
