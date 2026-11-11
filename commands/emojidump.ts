import { defineCommand } from 'yuzuha';
import { replyEmojiDump } from '../src/live.js';

export default defineCommand({
  name: 'emojidump',
  description: 'Empacota todos os emojis do servidor em um zip.',
  aliases: ['dumpemojis', 'exportaremojis', 'emojisdump', 'emojizip', 'zipemojis'],
  guildOnly: true,
  cooldown: '10s',
  examples: ['a.emojidump'],
  run: (ctx) => replyEmojiDump(ctx),
});
