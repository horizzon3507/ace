import { defineCommand } from 'yuzuha';
import { runModeration } from '../src/live.js';

export default defineCommand({
  name: 'unban',
  description: 'Remove o banimento de um usuário.',
  aliases: ['desbanir', 'desban', 'unb', 'unbanir', 'perdoar', 'desbanimento'],
  guildOnly: true,
  permissions: ['BanMembers'],
  botPermissions: ['BanMembers'],
  cooldown: '3s',
  examples: ['a.unban @usuario', 'a.unban 1234567890123 se arrependeu'],
  run: (ctx) => runModeration(ctx, 'unban'),
});
