import { defineCommand } from 'yuzuha';
import { runChannelLock } from '../src/live.js';

export default defineCommand({
  name: 'unlock',
  description: 'Destranca o canal novamente.',
  aliases: ['destrancar', 'abrir', 'liberar', 'unlockar', 'ulck', 'destravar', 'openchannel'],
  guildOnly: true,
  permissions: ['ManageRoles'],
  botPermissions: ['ManageRoles'],
  cooldown: '3s',
  examples: ['a.unlock', 'a.unlock #geral'],
  run: (ctx) => runChannelLock(ctx, 'unlock'),
});
