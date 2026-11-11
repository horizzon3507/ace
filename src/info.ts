import { embed, SDK, type GuildInfo, type MemberInfo, type UserInfo, type UserProfileInfo } from 'yuzuha';
import type { AceContext } from './context.js';
import { brand, formatAge, formatDayStamp, resolveAssetTarget } from './live.js';

const safe = <T>(fn: () => Promise<T>): Promise<T | null> => Promise.resolve().then(fn).catch(() => null);
const noun = (n: number, singular: string, plural = `${singular}s`) => n === 1 ? singular : plural;

// Sem gateway, resolve/fetch do client vira request REST que nunca retorna —
// só vale chamar quando isReady. ctx.client é getter que lança sem native.
const nativeClient = async (ctx: AceContext) => {
  const client = await safe(async () => ctx.client);
  return client?.isReady() ? client : null;
};
const nativeUser = async (ctx: AceContext, id: string) => {
  const client = await nativeClient(ctx);
  return client ? safe(() => client.users.resolve(id)) : null;
};

const PRIVILEGE_LADDER: { flag: keyof typeof SDK.PermissionFlags; label: string }[] = [
  { flag: 'Administrator', label: 'Administrador' },
  { flag: 'ManageGuild', label: 'Gerenciar servidor' },
  { flag: 'ManageRoles', label: 'Gerenciar cargos' },
  { flag: 'ManageChannels', label: 'Gerenciar canais' },
  { flag: 'BanMembers', label: 'Banir membros' },
  { flag: 'KickMembers', label: 'Expulsar membros' },
  { flag: 'ModerateMembers', label: 'Moderar membros' },
  { flag: 'ManageMessages', label: 'Gerenciar mensagens' },
];

const topPrivilege = (permissions: string): string | null => {
  const bits = BigInt(permissions || '0');
  return PRIVILEGE_LADDER.find(({ flag }) => (bits & SDK.PermissionFlags[flag]) !== 0n)?.label ?? null;
};

/** Card do usuário em campos inline: perfil completo de membro ou ficha global. */
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

  const roleList = member && guildID ? await safe(() => ctx.resources.roles.list(guildID)) : null;

  const name = (user.displayName || user.username).replace(/[*_~`]/g, '') || 'usuário';
  const avatar = user.avatarURL;
  const banner = (guildID ? profile?.serverProfile?.bannerURL : null)
    ?? profile?.globalProfile?.bannerURL
    ?? user.bannerURL;
  const bio = profile?.serverProfile?.bio ?? profile?.globalProfile?.bio;
  const pronouns = profile?.serverProfile?.pronouns ?? profile?.globalProfile?.pronouns;
  const mutuals = profile?.globalProfile?.mutualGuildIDs?.length ?? 0;
  const accounts = profile?.globalProfile?.connectedAccounts ?? [];
  const color = profile?.serverProfile?.accentColor ?? profile?.globalProfile?.accentColor ?? brand.background;

  const created = new Date(user.createdTimestamp);
  const fields: { name: string; value: string; inline: boolean }[] = [];

  // A tag #xxxx não vem no UserInfo do port — resolve via client nativo pronto
  // (sem gateway, resolve vira REST pendurado; isReady filtra client offline).
  const native = await nativeUser(ctx, user.id);
  const tag = native?.discriminator && native.discriminator !== '0'
    ? `${user.username}#${native.discriminator}`
    : user.username;
  const ficha = [
    `Este ${user.bot ? 'aplicativo' : 'usuário'} é <@${user.id}>, de nome de usuário \`${tag}\` e ID \`${user.id}\`!`,
  ];
  const nickname = member?.nickname?.replace(/[*_~`]/g, '');
  if (nickname) {
    ficha.push(`Seu apelido neste servidor é **${nickname}**!`);
  }
  if (mutuals > 0) {
    ficha.push(`Este usuário divide **${mutuals}** ${noun(mutuals, 'servidor', 'servidores')} comigo!`);
  }
  fields.push({ name: `${emoji.information} Ficha`, value: ficha.join('\n'), inline: true });
  fields.push({
    name: `${emoji.time} Conta criada`,
    value: `A conta deste usuário foi criada em ${formatDayStamp(created)}, ${formatAge(created)}!`,
    inline: true,
  });

  if (member) {
    const joined = new Date(member.joinedTimestamp);
    fields.push({
      name: `${emoji.happy} Entrada`,
      value: `Este membro entrou neste servidor em ${formatDayStamp(joined)}, ${formatAge(joined)}!`,
      inline: true,
    });

    const mine = (roleList ?? [])
      .filter((role) => role.id !== guildID && member.roles.includes(role.id))
      .sort((a, b) => b.position - a.position);
    const total = member.roles.filter((roleID) => roleID !== guildID).length;
    const hierarquia = [
      total === 0
        ? 'Este membro não possui cargos!'
        : `Este membro possui **${total}** ${noun(total, 'cargo', 'cargos')}!`,
    ];
    const privilege = topPrivilege(member.permissions);
    if (privilege) {
      hierarquia.push(`Seu maior privilégio é **${privilege}**!`);
    }
    fields.push({ name: `${emoji.lock} Hierarquia`, value: hierarquia.join('\n'), inline: true });

    if (mine.length > 0) {
      fields.push({
        name: `${emoji.unban} Cargos`,
        value: mine.length === 1
          ? `Seu único cargo é <@&${mine[0].id}>!`
          : `Seu cargo mais alto é <@&${mine[0].id}> e o mais baixo é <@&${mine.at(-1)!.id}>!`,
        inline: true,
      });
    }

    if (member.timedOutUntil !== null && member.timedOutUntil > Date.now()) {
      fields.push({
        name: `${emoji.unban} Situação`,
        value: `Este membro está silenciado até ${formatDayStamp(new Date(member.timedOutUntil))}!`,
        inline: true,
      });
    }
  }

  if (pronouns) {
    fields.push({
      name: `${emoji.happy} Pronomes`,
      value: `Seus pronomes são "${pronouns}". Incrível, não é?`,
      inline: true,
    });
  }

  if (accounts.length > 0) {
    const list = accounts.map((account) => `\`${account.name ?? account.type ?? '?'}\``).join(', ');
    fields.push({ name: `${emoji.globe} Conexões`, value: `Este usuário conectou ${list}!`, inline: true });
  }
  if (bio) {
    fields.push({ name: `${emoji.happy} Bio`, value: bio, inline: false });
  }

  await ctx.reply({
    embeds: [embed({
      color,
      author: avatar ? { name: `Informações de ${name}`, iconURL: avatar } : { name: `Informações de ${name}` },
      thumbnail: avatar ? { url: ctx.cdn.asset(avatar, { size: 1024 }) ?? avatar } : undefined,
      image: banner ? { url: ctx.cdn.asset(banner, { size: 4096 }) ?? banner } : undefined,
      fields,
    })],
  });
}

const NEEDED_PERMISSIONS: { flag: keyof typeof SDK.PermissionFlags; label: string }[] = [
  { flag: 'SendMessages', label: 'Enviar mensagens' },
  { flag: 'ManageMessages', label: 'Gerenciar mensagens' },
  { flag: 'ManageRoles', label: 'Gerenciar cargos' },
  { flag: 'ManageGuild', label: 'Gerenciar servidor' },
  { flag: 'KickMembers', label: 'Expulsar membros' },
  { flag: 'BanMembers', label: 'Banir membros' },
  { flag: 'ModerateMembers', label: 'Moderar membros' },
];

const VERIFICATION_LABELS: Record<number, string> = {
  0: 'nenhum', 1: 'baixo', 2: 'médio', 3: 'alto', 4: 'máximo',
};

const CONTENT_FILTER_LABELS: Record<number, string> = {
  0: 'desativado', 1: 'membros sem cargo', 2: 'todos os membros',
};

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

  const client = await nativeClient(ctx);
  const [counts, members, roles, channels, me, ownerInfo, ownerNative, native] = await Promise.all([
    safe(() => ctx.resources.users.guildCounts(guildID)),
    safe(() => ctx.resources.users.members(guildID, 1000)),
    safe(() => ctx.resources.roles.list(guildID)),
    safe(() => ctx.resources.channels.list(guildID)),
    safe(() => ctx.resources.users.me(guildID)),
    safe(() => ctx.resources.users.user(guild.ownerID)),
    client ? safe(() => client.users.resolve(guild.ownerID)) : null,
    client ? safe(() => client.guilds.resolve(guildID)) : null,
  ]);

  const joinAnd = (parts: string[]) => parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}`;

  const ownerTag = ownerNative
    ? ownerNative.discriminator && ownerNative.discriminator !== '0'
      ? `${ownerNative.username}#${ownerNative.discriminator}`
      : ownerNative.username
    : ownerInfo?.username;
  const ownerLine = ownerTag
    ? `O detentor(a) deste servidor é <@${guild.ownerID}>, de nome de usuário \`${ownerTag}\` e ID \`${guild.ownerID}\`!`
    : `O detentor(a) deste servidor é <@${guild.ownerID}>, ID \`${guild.ownerID}\`!`;

  const created = new Date(guild.createdTimestamp);
  const fields: { name: string; value: string; inline: boolean }[] = [
    { name: `${emoji.information} Ficha`, value: ownerLine, inline: true },
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
    const list = guild.features.map((feature) => FEATURE_LABELS[feature] ?? `\`${feature}\``).join(', ');
    fields.push({ name: `${emoji.globe} Recursos`, value: list, inline: true });
  }

  // Segurança: verificação, MFA, NSFW, filtro e notificações — o GuildInfo do
  // port não traz nenhum deles, então resolve via client nativo quando há.
  if (native) {
    fields.push({
      name: `${emoji.lock} Segurança`,
      value: [
        `Nível de verificação **${VERIFICATION_LABELS[native.verificationLevel] ?? `${native.verificationLevel}`}**`,
        `MFA **${native.mfaLevel === 1 ? 'exigido' : 'desativado'}**`,
        `NSFW **${native.nsfw ? 'sim' : 'não'}**`,
        `Filtro de conteúdo **${CONTENT_FILTER_LABELS[native.explicitContentFilter] ?? `${native.explicitContentFilter}`}**`,
        `Notificações padrão **${native.defaultMessageNotifications === 1 ? 'apenas menções' : 'todas as mensagens'}**`,
      ].join('\n'),
      inline: true,
    });
  }

  // Diagnóstico: field full-width por último — renderiza abaixo dos inline e
  // acima do banner. users.me falhando omite o bloco sem derrubar o comando.
  if (me) {
    const bits = BigInt(me.permissions);
    const admin = (bits & SDK.PermissionFlags.Administrator) !== 0n;
    const has = (flag: keyof typeof SDK.PermissionFlags) => admin || (bits & SDK.PermissionFlags[flag]) !== 0n;
    const missing = NEEDED_PERMISSIONS.filter(({ flag }) => !has(flag)).map(({ label }) => `**${label.toLowerCase()}**`);
    fields.push({
      name: `${emoji.unban} Diagnóstico`,
      value: missing.length === 0
        ? 'Não se preocupe com minhas permissões! **Todas** elas foram fornecidas corretamente, garantindo meu funcionamento estável!'
        : `Eu ainda necessito das permissões ${joinAnd(missing)} para garantir o meu funcionamento estável!`,
      inline: false,
    });
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
