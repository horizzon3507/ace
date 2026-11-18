import { defineCommand, type CommandCheck } from 'yuzuha';
import { replyEmojiIdDrop } from '../src/live.js';

const OWNER_ID = '1473035660161241245';

export default defineCommand({
  name: 'iddrop',
  description: 'Dropa todos os emojis do servidor em linha, separados por vírgula.',
  aliases: Object.freeze(['emojidrop', 'dropids', 'drop']) as string[],
  guildOnly: true,
  hidden: true,
  cooldown: 5_000,
  examples: Object.freeze(['iddrop']) as string[],
  checks: Object.freeze([(ctx) => (typeof ctx.isOwner === 'function' && ctx.isOwner()) || ctx.authorID === OWNER_ID || `${ctx.emoji.unhappy} Este comando é só para o meu detentor...`]) as CommandCheck[],
  run: (ctx) => replyEmojiIdDrop(ctx),
});
