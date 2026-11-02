import { defineCommand } from 'yuzuha';
import { brand } from '../src/live.js';
import { fixAnimatedAssetUrl } from '../src/cdn.js';

const HAPPY = '<:emotionhappyfill:1566571242956263425>';
const UNHAPPY = '<:emotionunhappyfill:1566571242956263424>';

function targetID(ctx: any): string {
  const mentions = ctx.message?.mentions ?? [];
  if (mentions.length) return mentions[0];
  const token = (ctx.tokens ?? []).find((t: string) => /^\d{5,}$/.test(t));
  if (token) return token;
  return ctx.authorID;
}

export default defineCommand({
  name: 'avatar',
  description: 'Exibe o avatar de um usuário.',
  aliases: [
    'av', 'pfp', 'profilepic', 'useravatar', 'userpfp', 'foto', 'fotoperfil',
    'avtr', 'dp', 'displaypic', 'userpic', 'memberavatar', 'mav',
  ],
  async run(ctx) {
    const id = targetID(ctx);
    try {
      const user = await ctx.resources.users.user(id);
      const url = fixAnimatedAssetUrl(user.avatarURL);
      const label = user.displayName || user.username;
      if (!url) {
        await ctx.reply(`${UNHAPPY} **${label}** não possui um avatar configurado.`);
        return;
      }
      await ctx.reply({
        embeds: [{
          title: `Avatar de ${label}`,
          color: brand.primary,
          image: { url },
        }],
      });
    } catch {
      await ctx.reply(`${UNHAPPY} Não foi possível carregar o avatar deste usuário.`);
    }
  },
});