import { defineCommand } from 'yuzuha';
import { replyEmojiDump } from '../src/live.js';

export default defineCommand({
  name: 'emojidump',
  description: 'Empacota todos os emojis do servidor em um zip.',
  aliases: Object.freeze(['dumpemojis', 'exportaremojis', 'emojisdump', 'emojizip', 'zipemojis']) as string[],
  guildOnly: true,
  cooldown: 10_000,
  examples: Object.freeze(['emojidump']) as string[],
  run: (ctx) => replyEmojiDump(ctx),
});
