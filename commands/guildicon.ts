import { defineCommand } from 'yuzuha';
import { replyGuildAsset } from '../src/embed.js';

export default defineCommand({
  name: 'guildicon',
  description: 'Exibe o ícone do servidor atual.',
  aliases: [
    'guildavatar', 'serveravatar', 'servericon', 'gav', 'guildpfp', 'serverpfp',
    'serverimg', 'guildimg', 'sap', 'gicon', 'sicon', 'serverpic', 'guildpic',
    'serveravatarpic', 'guildavatarpic', 'serverimage', 'guildimage', 'svav',
    'gvav', 'serverpfpic', 'guildpfpic',
    'gi', 'ga', 'gpfp',
    'svicon', 'gico', 'serverico', 'svic', 'iconedoservidor',
  ],
  guildOnly: true,
  run: (ctx) => replyGuildAsset(ctx, 'icon'),
});
