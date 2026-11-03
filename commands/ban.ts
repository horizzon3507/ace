import { defineCommand } from 'yuzuha';
import { runModeration } from '../src/live.js';

export default defineCommand({
  name: 'ban',
  description: 'Bane um membro do servidor.',
  aliases: ['banir', 'b', 'banhammer', 'martelo', 'bn', 'permaban', 'hammer', 'banimento'],
  guildOnly: true,
  permissions: ['BanMembers'],
  botPermissions: ['BanMembers'],
  cooldown: '3s',
  examples: ['a.ban @usuario spam'],
  run: (ctx) => runModeration(ctx, 'ban'),
});
