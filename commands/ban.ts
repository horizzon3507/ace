import { defineCommand } from 'yuzuha';
import { runModeration } from '../src/live.js';

export default defineCommand({
  name: 'ban',
  description: 'Bane um membro do servidor.',
  aliases: Object.freeze(['banir', 'b', 'banhammer', 'martelo', 'bn', 'permaban', 'hammer', 'banimento']) as string[],
  guildOnly: true,
  permissions: Object.freeze(['BanMembers']) as string[],
  botPermissions: Object.freeze(['BanMembers']) as string[],
  cooldown: 3_000,
  examples: Object.freeze(['ban @usuario spam']) as string[],
  run: (ctx) => runModeration(ctx, 'ban'),
});
