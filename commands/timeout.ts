import { defineCommand } from 'yuzuha';
import { runModeration } from '../src/live.js';

export default defineCommand({
  name: 'timeout',
  description: 'Silencia um membro por um tempo.',
  aliases: Object.freeze(['silenciar', 'mute', 'to', 'mutar', 'castigo', 'time-out', 'silencio']) as string[],
  guildOnly: true,
  permissions: Object.freeze(['ModerateMembers']) as string[],
  botPermissions: Object.freeze(['ModerateMembers']) as string[],
  cooldown: 3_000,
  examples: Object.freeze(['timeout @usuario 10m spam']) as string[],
  run: (ctx) => runModeration(ctx, 'timeout'),
});
