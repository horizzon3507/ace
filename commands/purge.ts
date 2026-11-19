import { defineCommand } from 'yuzuha';
import { runPurge } from '../src/live.js';

export default defineCommand({
  name: 'purge',
  description: 'Apaga mensagens recentes de um membro.',
  aliases: Object.freeze(['purgar', 'nuke', 'cleanuser', 'limparuser']) as string[],
  guildOnly: true,
  permissions: Object.freeze(['ManageMessages']) as string[],
  botPermissions: Object.freeze(['ManageMessages']) as string[],
  cooldown: 3_000,
  examples: Object.freeze(['purge @usuario', 'purge @usuario 25']) as string[],
  run: (ctx) => runPurge(ctx, 'user'),
});
