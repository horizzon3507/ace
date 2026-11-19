import { defineCommand } from 'yuzuha';
import { runChannelLock } from '../src/live.js';

export default defineCommand({
  name: 'unlock',
  description: 'Destranca o canal novamente.',
  aliases: Object.freeze(['destrancar', 'abrir', 'liberar', 'unlockar', 'ulck', 'destravar', 'openchannel']) as string[],
  guildOnly: true,
  permissions: Object.freeze(['ManageRoles']) as string[],
  botPermissions: Object.freeze(['ManageRoles']) as string[],
  cooldown: 3_000,
  examples: Object.freeze(['unlock', 'unlock #geral']) as string[],
  run: (ctx) => runChannelLock(ctx, 'unlock'),
});
