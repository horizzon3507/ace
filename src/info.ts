import { embed, type GuildInfo, type MemberInfo, type UserInfo, type UserProfileInfo } from 'yuzuha';
import type { AceContext } from './context.js';
import { formatStamp } from './format.js';
import { brand } from './live.js';
import { resolveAssetTarget } from './resolve.js';

/** Resolve o alvo como replyUserAsset, busca perfil→membro→usuário e responde o card em embed. */
export async function replyUserInfo(ctx: AceContext): Promise<void> {
  const { emoji } = ctx;
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
  let profile: UserProfileInfo | null = null;
  try {
    profile = await ctx.resources.users.profile(id, guildID ?? undefined);
  } catch {
    // Perfil indisponível: segue com member/user, só sem banner.
  }
  let user: UserInfo;
  let member: MemberInfo | null = null;
  try {
    if (guildID) {
      member = profile?.member ?? await ctx.resources.users.member(guildID, id).catch(() => null);
      user = member ?? profile?.user ?? await ctx.resources.users.user(id);
    } else {
      user = profile?.user ?? await ctx.resources.users.user(id);
    }
  } catch {
    await ctx.reply(`${emoji.unhappy} Eu não consegui carregar as informações deste usuário...`);
    return;
  }

  const name = (user.displayName || user.username).replace(/[*_~`]/g, '') || 'usuário';
  const avatar = user.avatarURL;
  const banner = (guildID ? profile?.serverProfile?.bannerURL : null)
    ?? profile?.globalProfile?.bannerURL
    ?? user.bannerURL;

  const lines = [`**@${user.username}** \`${user.id}\``];
  const nickname = member?.nickname?.replace(/[*_~`]/g, '');
  if (nickname) {
    lines.push(`Apelido **${nickname}**`);
  }
  lines.push(member
    ? `Entrou ${formatStamp(new Date(member.joinedTimestamp))} · Conta de ${formatStamp(new Date(user.createdTimestamp))}`
    : `Conta de ${formatStamp(new Date(user.createdTimestamp))}`);
  if (member) {
    const roles = member.roles.slice(0, 10).map((role) => `<@&${role}>`).join(' ');
    lines.push(`Cargos: ${roles || 'nenhum'}`);
    if (member.timedOutUntil !== null && member.timedOutUntil > Date.now()) {
      lines.push(`Silenciado até ${formatStamp(new Date(member.timedOutUntil))}`);
    }
  }

  await ctx.reply({
    embeds: [embed({
      color: brand.background,
      author: avatar ? { name, iconURL: avatar } : { name },
      thumbnail: avatar ? { url: avatar } : undefined,
      image: banner ? { url: ctx.cdn.asset(banner, { size: 4096 }) ?? banner } : undefined,
      description: lines.join('\n'),
    })],
  });
}

/** Busca a guild uma vez e responde as informações do servidor em embed. */
export async function replyGuildInfo(ctx: AceContext): Promise<void> {
  const { emoji } = ctx;
  const guildID = ctx.requireGuild();
  let guild: GuildInfo;
  try {
    guild = await ctx.resources.users.guild(guildID);
  } catch {
    await ctx.reply(`${emoji.unhappy} Eu não consegui carregar as informações deste servidor...`);
    return;
  }

  const icon = guild.iconURL;
  const banner = guild.bannerURL;
  const lines = [
    `\`${guild.id}\``,
    `Dono <@${guild.ownerID}> · **${guild.memberCount ?? '?'}** membros`,
    `Criado em ${formatStamp(new Date(guild.createdTimestamp))}`,
  ];
  if (guild.features?.length) {
    lines.push(`Recursos: ${guild.features.join(', ')}`);
  }

  await ctx.reply({
    embeds: [embed({
      color: brand.background,
      author: icon ? { name: guild.name, iconURL: icon } : { name: guild.name },
      thumbnail: icon ? { url: icon } : undefined,
      image: banner ? { url: ctx.cdn.asset(banner, { size: 4096 }) ?? banner } : undefined,
      description: lines.join('\n'),
    })],
  });
}
