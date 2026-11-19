import { defineCommand } from 'yuzuha';
import { runChannelLock } from '../src/live.js';

export default defineCommand({
  name: 'lock',
  description: 'Tranca o canal para novas mensagens.',
  aliases: Object.freeze(['trancar', 'fechar', 'cadeado', 'lockar', 'lck', 'trava', 'travar', 'closechannel']) as string[],
  guildOnly: true,
  permissions: Object.freeze(['ManageRoles']) as string[],
  botPermissions: Object.freeze(['ManageRoles']) as string[],
  cooldown: 3_000,
  examples: Object.freeze(['lock', 'lock #geral flood']) as string[],
  run: (ctx) => runChannelLock(ctx, 'lock'),
});
