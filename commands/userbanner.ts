import { defineCommand } from 'yuzuha';
import { brand } from '../src/live.js';
import { fixAnimatedAssetUrl } from '../src/cdn.js';

const UNHAPPY = '<:emotionunhappyfill:1566571242956263424>';

function targetID(ctx: any): string {
  const mentions = ctx.message?.mentions ?? [];
  if (mentions.length) return mentions[0];
  const token = (ctx.tokens ?? []).find((t: string) => /^\d{5,}$/.test(t));
  if (token) return token;
  return ctx.authorID;
}

export default defineCommand({
  name: 'userbanner',
  description: 'Exibe o banner de um usuário.',
  aliases: [
    'ubanner', 'banner', 'userbnr', 'ub', 'userbg', 'profilebanner',
    'usercover', 'cover', 'ubg', 'bann', 'userbanners',
  ],
  async run(ctx) {
    const id = targetID(ctx);
    try {
      const user = await ctx.resources.users.user(id);
      const url = fixAnimatedAssetUrl(user.bannerURL);
      const label = user.displayName || user.username;
      if (!url) {
        await ctx.reply(`${UNHAPPY} **${label}** não possui um banner configurado.`);
        return;
      }
      await ctx.reply({
        embeds: [{
          title: `Banner de ${label}`,
          color: brand.primary,
          image: { url },
        }],
      });
    } catch {
      await ctx.reply(`${UNHAPPY} Não foi possível carregar o banner deste usuário.`);
    }
  },
});