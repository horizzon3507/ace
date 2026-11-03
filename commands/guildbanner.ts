import { defineCommand } from 'yuzuha';
import { replyGuildAsset } from '../src/embed.js';

export default defineCommand({
  name: 'guildbanner',
  description: 'Exibe o banner do servidor atual.',
  aliases: [
    'serverbanner', 'sbanner', 'gbanner', 'guildbnr', 'sbnr', 'serverbg',
    'guildbg', 'servercover', 'guildcover', 'serverbannerpic', 'gbg',
  ],
  guildOnly: true,
  run: (ctx) => replyGuildAsset(ctx, 'banner'),
});
