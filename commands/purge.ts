import { defineCommand } from 'yuzuha';
import { runPurge } from '../src/live.js';

export default defineCommand({
  name: 'purge',
  description: 'Apaga mensagens recentes de um membro.',
  aliases: ['purgar', 'nuke', 'cleanuser', 'limparuser'],
  guildOnly: true,
  permissions: ['ManageMessages'],
  botPermissions: ['ManageMessages'],
  cooldown: '3s',
  examples: ['a.purge @usuario', 'a.purge @usuario 25'],
  run: (ctx) => runPurge(ctx, 'user'),
});
