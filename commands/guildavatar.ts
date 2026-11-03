import { defineCommand } from 'yuzuha';
import { fixAnimatedAssetUrl } from '../src/cdn.js';
import { replyAsset } from '../src/embed.js';
import { emoji } from '../src/emoji.js';

export default defineCommand({
  name: 'guildavatar',
  description: 'Exibe o ícone do servidor atual.',
  aliases: [
    'serveravatar', 'servericon', 'guildicon', 'gav', 'guildpfp', 'serverpfp',
    'serverimg', 'guildimg', 'sap', 'gicon', 'sicon', 'serverpic', 'guildpic',
    'serveravatarpic', 'guildavatarpic', 'serverimage', 'guildimage', 'svav',
    'gvav', 'serverpfpic', 'guildpfpic',
    'gi', 'ga', 'gpfp',
  ],
  guildOnly: true,
  async run(ctx) {
    const guildID = ctx.requireGuild();
    let guild;
    try {
      guild = await ctx.resources.users.guild(guildID);
    } catch {
      await ctx.reply(`${emoji.unhappy} Não foi possível carregar as informações deste servidor.`);
      return;
    }
    const iconUrl = fixAnimatedAssetUrl(guild.iconURL);
    if (!iconUrl) {
      await ctx.reply(`${emoji.unhappy} O servidor **${guild.name}** não possui um ícone configurado.`);
      return;
    }
    await replyAsset(ctx, `Ícone de ${guild.name}`, iconUrl);
  },
});
