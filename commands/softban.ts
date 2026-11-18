import { defineCommand } from 'yuzuha';
import { runModeration } from '../src/live.js';

export default defineCommand({
  name: 'softban',
  description: 'Expulsa um membro e limpa as mensagens recentes dele.',
  aliases: Object.freeze(['sb', 'soft', 'softbanir', 'banlimpo', 'limpaban', 'kicklimpo', 'fakeban', 'banirlimpar']) as string[],
  guildOnly: true,
  permissions: Object.freeze(['BanMembers']) as string[],
  botPermissions: Object.freeze(['BanMembers']) as string[],
  cooldown: 3_000,
  examples: Object.freeze(['softban @usuario spam']) as string[],
  run: (ctx) => runModeration(ctx, 'softban'),
});
