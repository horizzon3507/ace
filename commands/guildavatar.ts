import { defineCommand } from 'yuzuha';
import { brand } from '../src/live.js';
import { fixAnimatedAssetUrl } from '../src/cdn.js';

const UNHAPPY = '<:emotionunhappyfill:1566571242956263424>';

export default defineCommand({
  name: 'guildavatar',
  description: 'Exibe o avatar (ícone) do servidor atual.',
  aliases: [
    'serveravatar', 'servericon', 'guildicon', 'gav', 'guildpfp', 'serverpfp',
    'serverimg', 'guildimg', 'sap', 'gicon', 'sicon', 'serverpic', 'guildpic',
    'serveravatarpic', 'guildavatarpic', 'serverimage', 'guildimage', 'svav',
    'gvav', 'serverpfpic', 'guildpfpic',
  ],
  guildOnly: true,
  async run(ctx) {
    const guildID = ctx.requireGuild();
    try {
      let iconUrl: string | null = null;
      let name = '';
      try {
        const guild = await ctx.client.guilds.fetch(guildID);
        const animated = guild.icon?.startsWith('a_') ?? false;
        const base = guild.iconURL({ size: 512 });
        iconUrl = base
          ? (animated ? base.replace(/\.png(\?|$)/i, '.gif$1') : base)
          : null;
        name = guild.name;
      } catch {
        const guild = await ctx.resources.users.guild(guildID);
        iconUrl = fixAnimatedAssetUrl(guild.iconURL);
        name = guild.name;
      }
      if (!iconUrl) {
        await ctx.reply(`${UNHAPPY} O servidor **${name || 'atual'}** não possui um ícone configurado.`);
        return;
      }
      await ctx.reply({
        embeds: [{
          title: `Avatar de ${name || 'servidor'}`,
          color: brand.primary,
          image: { url: iconUrl },
        }],
      });
    } catch {
      await ctx.reply(`${UNHAPPY} Não foi possível carregar as informações deste servidor.`);
    }
  },
});