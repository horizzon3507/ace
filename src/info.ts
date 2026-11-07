import { embed, type EmbedField, type GuildInfo, type MemberInfo, type UserInfo } from 'yuzuha';
import { fixAnimatedAssetUrl } from './cdn.js';
import type { AceContext } from './context.js';
import { emoji } from './emoji.js';
import { formatStamp } from './format.js';
import { brand } from './live.js';
import { resolveAssetTarget } from './resolve.js';

/** Resolve o alvo como replyUserAsset, busca membro→usuário e responde o perfil em embed. */
export async function replyUserInfo(ctx: AceContext): Promise<void> {
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
  let member: MemberInfo | null = null;
  try {
    if (guildID) {
      member = await ctx.resources.users.member(guildID, id).catch(() => null);
      user = member ?? await ctx.resources.users.user(id);
    } else {
      user = await ctx.resources.users.user(id);
    }
  } catch {
    await ctx.reply(`${emoji.unhappy} Eu não consegui carregar as informações deste usuário...`);
    return;
  }

  const name = (user.displayName || user.username).replace(/[*_~`]/g, '') || 'usuário';
  const avatar = fixAnimatedAssetUrl(user.avatarURL);

  const fields: EmbedField[] = [
    { name: 'Usuário', value: `@${user.username}`, inline: true },
    { name: 'ID', value: user.id, inline: true },
  ];
  const nickname = member?.nickname?.replace(/[*_~`]/g, '');
  if (nickname) {
    fields.push({ name: 'Apelido', value: nickname, inline: true });
  }
  fields.push({ name: 'Conta criada', value: formatStamp(new Date(user.createdTimestamp)), inline: true });
  if (member) {
    fields.push({ name: 'Entrou no servidor', value: formatStamp(new Date(member.joinedTimestamp)), inline: true });
    const roles = member.roles.slice(0, 10).map((role) => `<@&${role}>`).join(' ');
    fields.push({ name: 'Cargos', value: roles || 'Nenhum' });
    if (member.timedOutUntil !== null && member.timedOutUntil > Date.now()) {
      fields.push({ name: 'Silenciado até', value: formatStamp(new Date(member.timedOutUntil)), inline: true });
    }
  }

  await ctx.reply({
    embeds: [embed({
      color: brand.primary,
      author: avatar ? { name, iconURL: avatar } : { name },
      thumbnail: avatar ? { url: avatar } : undefined,
      fields,
    })],
  });
}

/** Busca a guild uma vez e responde as informações do servidor em embed. */
export async function replyGuildInfo(ctx: AceContext): Promise<void> {
  const guildID = ctx.requireGuild();
  let guild: GuildInfo;
  try {
    guild = await ctx.resources.users.guild(guildID);
  } catch {
    await ctx.reply(`${emoji.unhappy} Eu não consegui carregar as informações deste servidor...`);
    return;
  }

  const icon = fixAnimatedAssetUrl(guild.iconURL);
  const fields: EmbedField[] = [
    { name: 'ID', value: guild.id, inline: true },
    { name: 'Dono', value: `<@${guild.ownerID}>`, inline: true },
    { name: 'Membros', value: `**${guild.memberCount ?? '?'}**`, inline: true },
    { name: 'Criado em', value: formatStamp(new Date(guild.createdTimestamp)), inline: true },
  ];
  if (guild.features?.length) {
    fields.push({ name: 'Recursos', value: guild.features.join(', ') });
  }

  await ctx.reply({
    embeds: [embed({
      color: brand.primary,
      author: icon ? { name: guild.name, iconURL: icon } : { name: guild.name },
      thumbnail: icon ? { url: icon } : undefined,
      fields,
    })],
  });
}
