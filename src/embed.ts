import { embed, type UserInfo } from 'yuzuha';
import { fixAnimatedAssetUrl, fullAssetSize } from './cdn.js';
import type { AceContext } from './context.js';
import { emoji } from './emoji.js';
import { brand } from './live.js';
import { resolveAssetTarget } from './resolve.js';

export async function replyAsset(ctx: AceContext, name: string, url: string, authorIcon: string | null = url): Promise<void> {
  await ctx.reply({
    embeds: [embed({
      color: brand.primary,
      author: authorIcon ? { name, iconURL: authorIcon } : { name },
      image: { url: fullAssetSize(url) },
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
  const guildID = ctx.requireGuild();
  let guild;
  try {
    guild = await ctx.resources.users.guild(guildID);
  } catch {
    await ctx.reply(`${emoji.unhappy} Eu não consegui carregar as informações deste servidor...`);
    return;
  }
  const spec = guildCopy[kind];
  const url = fixAnimatedAssetUrl(kind === 'icon' ? guild.iconURL : guild.bannerURL);
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

/** Media base da instância; sem client nativo (testes) cai no CDN hospedado. */
function mediaBase(ctx: AceContext): string {
  try {
    return ctx.client.instance.endpoints.media.replace(/\/+$/, '');
  } catch {
    return 'https://fluxerusercontent.com';
  }
}

/** O objeto user do Fluxer não traz o banner — o hash só sai no endpoint de perfil. */
function profileBannerURL(ctx: AceContext, userID: string, hash: string | null | undefined): string | null {
  if (!hash) return null;
  const ext = hash.startsWith('a_') ? 'gif' : 'png';
  return `${mediaBase(ctx)}/banners/${userID}/${hash}.${ext}`;
}

/** Resolve o alvo, busca membro→usuário e responde o asset em embed. */
export async function replyUserAsset(ctx: AceContext, kind: UserAsset): Promise<void> {
  const spec = userCopy[kind];
  const target = await resolveAssetTarget(ctx);
  let id: string;
  if (target.status === 'found' || target.status === 'author') {
    id = target.status === 'found' ? target.id : ctx.authorID;
  } else {
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

  const guildID = ctx.message.guildID;
  let user: UserInfo;
  let bannerHash: string | null = null;
  try {
    if (kind === 'banner') {
      const profile = await ctx.resources.users.profile(id, guildID ?? undefined);
      user = profile.member ?? profile.user;
      bannerHash = (guildID ? profile.serverProfile?.banner : null) ?? profile.globalProfile?.banner ?? null;
    } else {
      user = guildID
        ? await ctx.resources.users.member(guildID, id).catch(() => ctx.resources.users.user(id))
        : await ctx.resources.users.user(id);
    }
  } catch {
    await ctx.reply(`${emoji.unhappy} Eu não consegui carregar ${spec.fail} deste usuário...`);
    return;
  }
  const label = (user.displayName || user.username).replace(/[*_~`]/g, '') || 'usuário';
  const url = kind === 'banner'
    ? profileBannerURL(ctx, id, bannerHash) ?? fixAnimatedAssetUrl(user.bannerURL)
    : fixAnimatedAssetUrl(user.avatarURL);
  if (!url) {
    await ctx.reply(`${emoji.unhappy} ${label} não possui ${spec.asset} configurado...`);
    return;
  }
  await replyAsset(ctx, `${spec.label} de ${label}`, url);
}
