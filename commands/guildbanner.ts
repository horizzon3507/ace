import { defineCommand } from 'yuzuha';
import { fixAnimatedAssetUrl } from '../src/cdn.js';
import { replyAsset } from '../src/embed.js';
import { emoji } from '../src/emoji.js';

export default defineCommand({
  name: 'guildbanner',
  description: 'Exibe o banner do servidor atual.',
  aliases: [
    'serverbanner', 'sbanner', 'gbanner', 'guildbnr', 'sbnr', 'serverbg',
    'guildbg', 'servercover', 'guildcover', 'serverbannerpic', 'gbg',
  ],
  guildOnly: true,
  async run(ctx) {
    const guildID = ctx.requireGuild();
    let guild;
    try {
      guild = await ctx.resources.users.guild(guildID);
    } catch {
      await ctx.reply(`${emoji.unhappy} Não foi possível carregar o banner deste servidor.`);
      return;
    }
    const url = fixAnimatedAssetUrl(guild.bannerURL);
    if (!url) {
      await ctx.reply(`${emoji.unhappy} O servidor **${guild.name}** não possui um banner configurado.`);
      return;
    }
    await replyAsset(ctx, `Banner de ${guild.name}`, url);
  },
});
