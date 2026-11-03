import { defineCommand, type UserInfo } from 'yuzuha';
import { fixAnimatedAssetUrl } from '../src/cdn.js';
import { replyAsset } from '../src/embed.js';
import { emoji } from '../src/emoji.js';
import { resolveAssetTarget } from '../src/resolve.js';

export default defineCommand({
  name: 'avatar',
  description: 'Exibe o avatar de um usuário.',
  aliases: [
    'av', 'pfp', 'profilepic', 'useravatar', 'userpfp', 'foto', 'fotoperfil',
    'avtr', 'dp', 'displaypic', 'userpic', 'memberavatar', 'mav',
    'ui', 'ua', 'upfp', 'usericon', 'userav',
  ],
  async run(ctx) {
    const target = await resolveAssetTarget(ctx);
    let id: string;
    if (target.status === 'found' || target.status === 'author') {
      id = target.status === 'found' ? target.id : ctx.authorID;
    } else {
      const text = target.status === 'missing'
        ? `${emoji.unhappy} Não encontrei ninguém como **${target.query}**.\n-# ╰ Use menção ou ID do usuário.`
        : target.status === 'ambiguous'
          ? `${emoji.unhappy} Encontrei vários membros como **${target.query}**.\n-# ╰ Use menção ou ID do usuário.`
          : ctx.message.guildID
            ? `${emoji.unhappy} Informe o usuário.\n-# ╰ Ex: \`a.avatar @usuario\``
            : `${emoji.unhappy} Informe o usuário por menção ou ID.`;
      await ctx.reply(text);
      return;
    }

    const guildID = ctx.message.guildID;
    let user: UserInfo;
    try {
      user = guildID
        ? await ctx.resources.users.member(guildID, id).catch(() => ctx.resources.users.user(id))
        : await ctx.resources.users.user(id);
    } catch {
      await ctx.reply(`${emoji.unhappy} Não foi possível carregar o avatar deste usuário.`);
      return;
    }
    const label = (user.displayName || user.username).replace(/[*_~`]/g, '') || 'usuário';
    const url = fixAnimatedAssetUrl(user.avatarURL);
    if (!url) {
      await ctx.reply(`${emoji.unhappy} **${label}** não possui um avatar configurado.`);
      return;
    }
    await replyAsset(ctx, `Avatar de ${label}`, url);
  },
});
