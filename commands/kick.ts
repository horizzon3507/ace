import { defineCommand } from 'yuzuha';
import { runModeration } from '../src/live.js';

export default defineCommand({
  name: 'kick',
  description: 'Expulsa um membro do servidor.',
  aliases: ['expulsar', 'k', 'exp', 'kickar', 'kk', 'boot', 'remover', 'eject'],
  guildOnly: true,
  permissions: ['KickMembers'],
  botPermissions: ['KickMembers'],
  cooldown: '3s',
  examples: ['a.kick @usuario spam'],
  run: (ctx) => runModeration(ctx, 'kick'),
});
