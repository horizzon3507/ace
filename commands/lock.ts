import { defineCommand } from 'yuzuha';
import { runChannelLock } from '../src/live.js';

export default defineCommand({
  name: 'lock',
  description: 'Tranca o canal para novas mensagens.',
  aliases: ['trancar', 'fechar', 'cadeado', 'lockar', 'lck', 'trava', 'travar', 'closechannel'],
  guildOnly: true,
  permissions: ['ManageRoles'],
  botPermissions: ['ManageRoles'],
  cooldown: '3s',
  examples: ['a.lock', 'a.lock #geral flood'],
  run: (ctx) => runChannelLock(ctx, 'lock'),
});
