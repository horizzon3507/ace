import { defineCommand } from 'yuzuha';
import { replyGuildAsset } from '../src/live.js';

export default defineCommand({
  name: 'guildbanner',
  description: 'Exibe o banner do servidor atual.',
  aliases: Object.freeze([
    'serverbanner', 'sbanner', 'gbanner', 'guildbnr', 'sbnr', 'serverbg',
    'guildbg', 'servercover', 'guildcover', 'serverbannerpic', 'gbg',
    'sbg', 'svbanner', 'gbr', 'serverbnr', 'bannerdoservidor', 'gb',
  ]) as string[],
  guildOnly: true,
  examples: Object.freeze(['guildbanner']) as string[],
  run: (ctx) => replyGuildAsset(ctx, 'banner'),
});
