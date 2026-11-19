import { defineCommand } from 'yuzuha';
import { runModeration } from '../src/live.js';

export default defineCommand({
  name: 'kick',
  description: 'Expulsa um membro do servidor.',
  aliases: Object.freeze(['expulsar', 'k', 'exp', 'kickar', 'kk', 'boot', 'remover', 'eject']) as string[],
  guildOnly: true,
  permissions: Object.freeze(['KickMembers']) as string[],
  botPermissions: Object.freeze(['KickMembers']) as string[],
  cooldown: 3_000,
  examples: Object.freeze(['kick @usuario spam']) as string[],
  run: (ctx) => runModeration(ctx, 'kick'),
});
