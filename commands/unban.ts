import { defineCommand } from 'yuzuha';
import { runModeration } from '../src/live.js';

export default defineCommand({
  name: 'unban',
  description: 'Remove o banimento de um usuário.',
  aliases: Object.freeze(['desbanir', 'desban', 'unb', 'unbanir', 'perdoar', 'desbanimento']) as string[],
  guildOnly: true,
  permissions: Object.freeze(['BanMembers']) as string[],
  botPermissions: Object.freeze(['BanMembers']) as string[],
  cooldown: 3_000,
  examples: Object.freeze(['unban @usuario', 'unban 1234567890123 se arrependeu']) as string[],
  run: (ctx) => runModeration(ctx, 'unban'),
});
