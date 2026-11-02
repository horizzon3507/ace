import { defineCommand } from 'yuzuha';
import { brand } from '../src/live.js';
import { fixAnimatedAssetUrl } from '../src/cdn.js';

const UNHAPPY = '<:emotionunhappyfill:1566571242956263424>';

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
    try {
      const guild = await ctx.resources.users.guild(guildID);
      const url = fixAnimatedAssetUrl(guild.bannerURL);
      if (!url) {
        await ctx.reply(`${UNHAPPY} O servidor **${guild.name}** não possui um banner configurado.`);
        return;
      }
      await ctx.reply({
        embeds: [{
          title: `Banner de ${guild.name}`,
          color: brand.primary,
          image: { url },
        }],
      });
    } catch {
      await ctx.reply(`${UNHAPPY} Não foi possível carregar o banner deste servidor.`);
    }
  },
});