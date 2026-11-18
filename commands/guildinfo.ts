import { defineCommand } from 'yuzuha';
import { replyGuildInfo } from '../src/live.js';

export default defineCommand({
  name: 'guildinfo',
  description: 'Mostra informações do servidor.',
  aliases: Object.freeze(['serverinfo', 'server', 'guild', 'infoserver', 'infoguild', 'si']) as string[],
  guildOnly: true,
  cooldown: 3_000,
  examples: Object.freeze(['guildinfo']) as string[],
  run: (ctx) => replyGuildInfo(ctx),
});
