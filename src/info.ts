import { embed, type GuildInfo, type MemberInfo, type UserInfo, type UserProfileInfo } from 'yuzuha';
import type { AceContext } from './context.js';
import { formatDayStamp, formatStamp } from './format.js';
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

/** Ficha do servidor em campos inline: guild obrigatória, contadores degradáveis. */
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

  const safe = <T>(fn: () => Promise<T>): Promise<T | null> => Promise.resolve().then(fn).catch(() => null);
  const [members, roles, channels] = await Promise.all([
    safe(() => ctx.resources.users.members(guildID, 1000)),
    safe(() => ctx.resources.roles.list(guildID)),
    safe(() => ctx.resources.channels.list(guildID)),
  ]);

  const fields: { name: string; value: string; inline: true }[] = [
    { name: `${emoji.information} Ficha`, value: `**${guild.name}**\n\`${guild.id}\`\nDono <@${guild.ownerID}>`, inline: true },
    { name: `${emoji.time} Criado em`, value: formatDayStamp(new Date(guild.createdTimestamp)), inline: true },
  ];

  const total = guild.memberCount ?? members?.length ?? null;
  if (members?.length && total !== null) {
    const bots = members.filter((member) => member.bot).length;
    const full = members.length >= total;
    fields.push({
      name: `${emoji.happy} Pessoas`,
      value: `**${total}** no total${full ? `\n**${members.length - bots}** usuários · **${bots}** apps` : ''}`,
      inline: true,
    });
  } else if (total !== null) {
    fields.push({ name: `${emoji.happy} Pessoas`, value: `**${total}** no total`, inline: true });
  }

  if (roles?.length) {
    const real = roles.filter((role) => role.id !== guildID);
    const top = real.length ? real.reduce((a, b) => (b.position > a.position ? b : a)) : null;
    const base = real.length ? real.reduce((a, b) => (b.position < a.position ? b : a)) : null;
    const lines = [`**${roles.length}**`];
    if (top && base && top.id !== base.id) lines.push(`Topo <@&${top.id}>`, `Base <@&${base.id}>`);
    else if (top) lines.push(`Topo <@&${top.id}>`);
    fields.push({ name: `${emoji.commandline} Cargos`, value: lines.join('\n'), inline: true });
  }

  if (channels?.length) {
    const voice = channels.filter((channel) => channel.type === 2 || channel.type === 13).length;
    const categories = channels.filter((channel) => channel.type === 4).length;
    const text = channels.length - voice - categories;
    fields.push({
      name: `${emoji.globe} Canais`,
      value: `**${text}** texto · **${voice}** voz\n**${categories}** ${categories === 1 ? 'categoria' : 'categorias'} — **${channels.length}** total`,
      inline: true,
    });
  }

  const icon = guild.iconURL;
  const banner = guild.bannerURL;
  await ctx.reply({
    embeds: [embed({
      color: brand.background,
      author: icon ? { name: guild.name, iconURL: icon } : { name: guild.name },
      thumbnail: icon ? { url: icon } : undefined,
      image: banner ? { url: ctx.cdn.asset(banner, { size: 4096 }) ?? banner } : undefined,
      fields,
    })],
  });
}
