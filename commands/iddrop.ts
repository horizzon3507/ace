import { defineCommand } from 'yuzuha';
import { replyEmojiIdDrop } from '../src/live.js';

const OWNER_ID = '1473035660161241245';

export default defineCommand({
  name: 'iddrop',
  description: 'Dropa todos os emojis do servidor em linha, separados por vírgula.',
  aliases: ['emojidrop', 'dropids', 'drop'],
  guildOnly: true,
  hidden: true,
  cooldown: 5_000,
  examples: ['iddrop'],
  checks: [(ctx) => (typeof ctx.isOwner === 'function' && ctx.isOwner()) || ctx.authorID === OWNER_ID || `${ctx.emoji.unhappy} Este comando é só para o meu detentor...`],
  run: (ctx) => replyEmojiIdDrop(ctx),
});
