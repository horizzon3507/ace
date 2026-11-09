import { embed, type UserInfo } from 'yuzuha';
import type { AceContext } from './context.js';
import { brand } from './live.js';
import { resolveAssetTarget } from './resolve.js';

export async function replyAsset(ctx: AceContext, name: string, url: string, authorIcon: string | null = url): Promise<void> {
  await ctx.reply({
    embeds: [embed({
      color: brand.primary,
      author: authorIcon ? { name, iconURL: authorIcon } : { name },
      image: { url: ctx.cdn.asset(url, { size: 4096 }) ?? url },
    })],
  });
}

export type GuildAsset = 'icon' | 'banner';

const guildCopy = {
  icon: { label: 'Ícone', asset: 'um ícone', authorIcon: true },
  banner: { label: 'Banner', asset: 'um banner', authorIcon: false },
} as const;

/** Busca a guild uma vez e responde o asset em embed; sem asset, avisa. */
export async function replyGuildAsset(ctx: AceContext, kind: GuildAsset): Promise<void> {
  const { emoji } = ctx;
  const guildID = ctx.requireGuild();
  let guild;
  try {
    guild = await ctx.resources.users.guild(guildID);
  } catch {
    await ctx.reply(`${emoji.unhappy} Eu não consegui carregar as informações deste servidor...`);
    return;
  }
  const spec = guildCopy[kind];
  const url = kind === 'icon' ? guild.iconURL : guild.bannerURL;
  if (!url) {
    await ctx.reply(`${emoji.unhappy} O servidor ${guild.name} não possui ${spec.asset} configurado...`);
    return;
  }
  await replyAsset(ctx, `${spec.label} de ${guild.name}`, url, spec.authorIcon ? url : null);
}

export type UserAsset = 'avatar' | 'banner';

const userCopy = {
  avatar: { label: 'Avatar', command: 'avatar', fail: 'o avatar', asset: 'um avatar' },
  banner: { label: 'Banner', command: 'userbanner', fail: 'o banner', asset: 'um banner' },
} as const;

/** Resolve o alvo, busca membro→usuário e responde o asset em embed. */
export async function replyUserAsset(ctx: AceContext, kind: UserAsset): Promise<void> {
  const { emoji } = ctx;
  const spec = userCopy[kind];
  const target = await resolveAssetTarget(ctx);
  if (target.status !== 'found') {
    const text = target.status === 'missing'
      ? `${emoji.unhappy} Eu não encontrei ninguém como ${target.query}! Use menção ou ID de usuário...`
      : target.status === 'ambiguous'
        ? `${emoji.unhappy} Eu encontrei vários membros como ${target.query}! Use menção ou ID de usuário...`
        : ctx.message.guildID
          ? `${emoji.unhappy} Por favor, me informe um usuário válido...`
          : `${emoji.unhappy} Por favor, me informe o usuário por menção ou ID de usuário...`;
    await ctx.reply(text);
    return;
  }
  const { id } = target;

  const guildID = ctx.message.guildID;
  let user: UserInfo;
  let url: string | null;
  try {
    if (kind === 'banner') {
      // users.bannerURL resolve o perfil por dentro — servidor primeiro, animado incluso.
      const [member, banner] = await Promise.all([
        guildID ? ctx.resources.users.member(guildID, id).catch(() => null) : null,
        ctx.resources.users.bannerURL(id, guildID ?? undefined, { size: 4096 }),
      ]);
      user = member ?? (await ctx.resources.users.user(id));
      url = banner ?? user.bannerURL;
    } else {
      user = guildID
        ? await ctx.resources.users.member(guildID, id).catch(() => ctx.resources.users.user(id))
        : await ctx.resources.users.user(id);
      url = user.avatarURL;
    }
  } catch {
    await ctx.reply(`${emoji.unhappy} Eu não consegui carregar ${spec.fail} deste usuário...`);
    return;
  }
  const label = (user.displayName || user.username).replace(/[*_~`]/g, '') || 'usuário';
  if (!url) {
    await ctx.reply(`${emoji.unhappy} ${label} não possui ${spec.asset} configurado...`);
    return;
  }
  await replyAsset(ctx, `${spec.label} de ${label}`, url);
}
