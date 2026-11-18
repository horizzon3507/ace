import { defineCommand } from 'yuzuha';
import { runPurge } from '../src/live.js';

export default defineCommand({
  name: 'clear',
  description: 'Apaga as últimas mensagens do canal.',
  aliases: ['limpar', 'clean', 'apagar', 'cls', 'limpo', 'clearmsg'],
  guildOnly: true,
  permissions: ['ManageMessages'],
  botPermissions: ['ManageMessages'],
  cooldown: 3_000,
  examples: ['clear 20'],
  run: (ctx) => runPurge(ctx, 'channel'),
});
