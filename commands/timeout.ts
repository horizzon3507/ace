import { defineCommand } from 'yuzuha';
import { runModeration } from '../src/live.js';

export default defineCommand({
  name: 'timeout',
  description: 'Silencia um membro por um tempo.',
  aliases: ['silenciar', 'mute', 'to', 'mutar', 'castigo', 'time-out', 'silencio'],
  guildOnly: true,
  permissions: ['ModerateMembers'],
  botPermissions: ['ModerateMembers'],
  cooldown: '3s',
  examples: ['a.timeout @usuario 10m spam'],
  run: (ctx) => runModeration(ctx, 'timeout'),
});
