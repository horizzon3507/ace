import { defineCommand } from 'yuzuha';
import { replyGuildInfo } from '../src/live.js';

export default defineCommand({
  name: 'guildinfo',
  description: 'Mostra informações do servidor.',
  aliases: ['serverinfo', 'server', 'guild', 'infoserver', 'infoguild', 'si'],
  guildOnly: true,
  cooldown: '3s',
  run: (ctx) => replyGuildInfo(ctx),
});
