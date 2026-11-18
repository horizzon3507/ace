import { defineCommand } from 'yuzuha';
import { replyGuildAsset } from '../src/live.js';

export default defineCommand({
  name: 'guildicon',
  description: 'Exibe o ícone do servidor atual.',
  aliases: Object.freeze([
    'guildavatar', 'serveravatar', 'servericon', 'gav', 'guildpfp', 'serverpfp',
    'serverimg', 'guildimg', 'sap', 'gicon', 'sicon', 'serverpic', 'guildpic',
    'serveravatarpic', 'guildavatarpic', 'serverimage', 'guildimage', 'svav',
    'gvav', 'serverpfpic', 'guildpfpic',
    'gi', 'ga', 'gpfp',
    'svicon', 'gico', 'serverico', 'svic', 'iconedoservidor',
  ]) as string[],
  guildOnly: true,
  examples: Object.freeze(['guildicon']) as string[],
  run: (ctx) => replyGuildAsset(ctx, 'icon'),
});
