import { embed } from 'yuzuha';
import { fixAnimatedAssetUrl } from './cdn.js';
import type { AceContext } from './context.js';
import { emoji } from './emoji.js';
import { brand } from './live.js';

export async function replyAsset(ctx: AceContext, name: string, url: string, authorIcon: string | null = url): Promise<void> {
  await ctx.reply({
    embeds: [embed({
      color: brand.primary,
      author: authorIcon ? { name, iconURL: authorIcon } : { name },
      image: { url },
    })],
  });
}

export type GuildAsset = 'icon' | 'banner';

const copy = {
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
    await ctx.reply(`${emoji.unhappy} Não foi possível carregar as informações deste servidor.`);
    return;
  }
  const spec = copy[kind];
  const url = fixAnimatedAssetUrl(kind === 'icon' ? guild.iconURL : guild.bannerURL);
  if (!url) {
    await ctx.reply(`${emoji.unhappy} O servidor **${guild.name}** não possui ${spec.asset} configurado.`);
    return;
  }
  await replyAsset(ctx, `${spec.label} de ${guild.name}`, url, spec.authorIcon ? url : null);
}
