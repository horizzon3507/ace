import { embed, type GuildInfo, type MemberInfo, type UserInfo, type UserProfileInfo } from 'yuzuha';
import type { AceContext } from './context.js';
import { formatAge, formatDayStamp, formatStamp } from './format.js';
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

const FEATURE_LABELS: Record<string, string> = {
  ANIMATED_BANNER: 'banner animado',
  ANIMATED_ICON: 'ícone animado',
  BANNER: 'banner',
  INVITE_SPLASH: 'splash de convite',
  VERIFIED: 'verificado',
  PARTNERED: 'parceiro',
  COMMUNITY: 'comunidade',
  DISCOVERABLE: 'descobrível',
  CLONE_EMOJI_ENABLED: 'clonar emojis',
  TEXT_CHANNEL_FLEXIBLE_NAMES: 'nomes flexíveis de canal',
  VANITY_URL: 'URL personalizada',
  MEMBER_VERIFICATION_GATE_ENABLED: 'verificação de entrada',
  NEWS: 'anúncios',
  THREADS_ENABLED: 'tópicos',
};

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
  const [counts, members, roles, channels] = await Promise.all([
    safe(() => ctx.resources.users.guildCounts(guildID)),
    safe(() => ctx.resources.users.members(guildID, 1000)),
    safe(() => ctx.resources.roles.list(guildID)),
    safe(() => ctx.resources.channels.list(guildID)),
  ]);

  const joinAnd = (parts: string[]) => parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}`;
  const noun = (n: number, singular: string, plural = `${singular}s`) => n === 1 ? singular : plural;

  const created = new Date(guild.createdTimestamp);
  const fields: { name: string; value: string; inline: boolean }[] = [
    { name: `${emoji.information} Ficha`, value: `O diretor deste servidor é <@${guild.ownerID}>, id \`${guild.ownerID}\`!`, inline: true },
    { name: `${emoji.time} Criado em`, value: `Este servidor foi criado em ${formatDayStamp(created)}, ${formatAge(created)}!`, inline: true },
  ];

  const total = counts?.memberCount ?? guild.memberCount ?? members?.length ?? null;
  const full = members?.length && total !== null && members.length >= total;
  if (total !== null) {
    const bots = full ? members!.filter((member) => member.bot).length : null;
    const humans = bots !== null ? members!.length - bots : 0;
    const split = bots !== null ? `, sendo **${humans}** ${noun(humans, 'humano')} e **${bots}** ${noun(bots, 'aplicativo')}` : '';
    const online = counts?.onlineCount !== undefined ? `Temos **${counts.onlineCount}** usuários online!` : '';
    fields.push({
      name: `${emoji.happy} Pessoas`,
      value: `Há **${total}** ${noun(total, 'usuário')}${split}${online ? `. ${online}` : '!'}`,
      inline: true,
    });
  }

  if (roles?.length) {
    const real = roles.filter((role) => role.id !== guildID);
    const top = real.length ? real.reduce((a, b) => (b.position > a.position ? b : a)) : null;
    const base = real.length ? real.reduce((a, b) => (b.position < a.position ? b : a)) : null;
    const tail = top && base && top.id !== base.id
      ? `, sendo o que está no topo <@&${top.id}> e o que está na base <@&${base.id}>`
      : top ? `, sendo o que está no topo <@&${top.id}>` : '';
    fields.push({ name: `${emoji.lock} Cargos`, value: `Este servidor possui **${roles.length}** ${noun(roles.length, 'cargo')}${tail}!`, inline: true });
  }

  if (channels?.length) {
    const items: string[] = [];
    const push = (type: number | number[], singular: string, plural: string) => {
      const count = channels.filter((channel) => (Array.isArray(type) ? type : [type]).includes(channel.type)).length;
      if (count) items.push(`**${count}** ${noun(count, singular, plural)}`);
    };
    push([0, 5], 'canal de texto', 'canais de texto');
    push([2, 13], 'canal de voz', 'canais de voz');
    push(15, 'fórum', 'fóruns');
    push(4, 'categoria', 'categorias');
    fields.push({
      name: `${emoji.commandline} Canais`,
      value: `Há **${channels.length}** ${noun(channels.length, 'canal', 'canais')}${items.length ? `, sendo deles ${joinAnd(items)}` : ''}!`,
      inline: true,
    });
  }

  if (guild.features?.length) {
    const list = guild.features.map((feature) => FEATURE_LABELS[feature] ?? `\`${feature}\``).join(' · ');
    fields.push({ name: `${emoji.globe} Recursos`, value: list, inline: true });
  }

  const icon = guild.iconURL;
  const banner = guild.bannerURL;
  await ctx.reply({
    embeds: [embed({
      color: brand.background,
      author: { name: `Informações de ${guild.name}`, iconURL: icon ?? undefined },
      thumbnail: icon ? { url: ctx.cdn.asset(icon, { size: 1024 }) ?? icon } : undefined,
      image: banner ? { url: ctx.cdn.asset(banner, { size: 4096 }) ?? banner } : undefined,
      fields,
    })],
  });
}
