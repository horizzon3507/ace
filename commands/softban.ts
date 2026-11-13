import { defineCommand } from 'yuzuha';
import { runModeration } from '../src/live.js';

export default defineCommand({
  name: 'softban',
  description: 'Expulsa um membro e limpa as mensagens recentes dele.',
  aliases: ['sb', 'soft', 'softbanir', 'banlimpo', 'limpaban', 'kicklimpo', 'fakeban', 'banirlimpar'],
  guildOnly: true,
  permissions: ['BanMembers'],
  botPermissions: ['BanMembers'],
  cooldown: '3s',
  examples: ['a.softban @usuario spam'],
  run: (ctx) => runModeration(ctx, 'softban'),
});
