import { defineCommand } from 'yuzuha';
import { runPurge } from '../src/live.js';

export default defineCommand({
  name: 'clear',
  description: 'Apaga as últimas mensagens do canal.',
  aliases: Object.freeze(['limpar', 'clean', 'apagar', 'cls', 'limpo', 'clearmsg']) as string[],
  guildOnly: true,
  permissions: Object.freeze(['ManageMessages']) as string[],
  botPermissions: Object.freeze(['ManageMessages']) as string[],
  cooldown: 3_000,
  examples: Object.freeze(['clear 20']) as string[],
  run: (ctx) => runPurge(ctx, 'channel'),
});
