import { defineCommand } from 'yuzuha';
import { setGuildAutoroleCache } from '../src/guild-autorole.js';
import { joinRoleFor } from '../src/join-role.js';

const ADMIN = 0x8n;
const OFF = /^(off|reset|nenhum|desligado|desligar|remover|none)$/i;

type RoleRef = { id: string; position: number };
type MemberRef = { roles: string[]; permissions: string };

/** Maior posição do membro; Administrator e dono do servidor passam por cima de tudo. */
const topOf = (roles: readonly RoleRef[], member: MemberRef, ownerID: string, userID: string): number =>
  userID === ownerID || (BigInt(member.permissions) & ADMIN) !== 0n
    ? Number.MAX_SAFE_INTEGER
    : Math.max(0, ...roles.filter((role) => member.roles.includes(role.id)).map((role) => role.position));

export default defineCommand({
  name: 'autorole',
  description: 'Cargo automático pra quem entra no servidor.',
  aliases: ['joinrole', 'autocargo', 'cargoautomatico', 'cargodeentrada', 'cargauto', 'autojoinrole'],
  guildOnly: true,
  permissions: ['ManageRoles'],
  botPermissions: ['ManageRoles'],
  cooldown: '3s',
  examples: ['a.autorole @Membros', 'a.autorole off'],
  async run(ctx) {
    const guildID = ctx.requireGuild();
    const arg = ctx.tokens.join(' ').trim();

    if (!arg) {
      const roleId = await joinRoleFor(guildID);
      await ctx.reply(roleId
        ? `${ctx.emoji.team} Quem entrar neste servidor recebe <@&${roleId}> automaticamente!`
        : `${ctx.emoji.information} O autorole está desligado aqui... Ligue com \`a.autorole @cargo\`.`);
      return;
    }

    if (OFF.test(arg)) {
      await ctx.data.guild.set('autorole', 'off');
      setGuildAutoroleCache(guildID, 'off');
      await ctx.reply(`${ctx.emoji.happy} Autorole desligado! Quem entrar não recebe mais cargo automático.`);
      return;
    }

    let role;
    try {
      role = await ctx.resources.roles.resolve(guildID, arg);
    } catch {
      await ctx.reply(`${ctx.emoji.unhappy} Eu não encontrei nenhum cargo como ${arg}! Use menção, ID ou nome exato...`);
      return;
    }
    if (role.managed || role.id === guildID) {
      await ctx.reply(`${ctx.emoji.unhappy} Este cargo eu não consigo entregar — ele é do @everyone ou gerenciado por uma integração...`);
      return;
    }

    const [guild, author, me, roles] = await Promise.all([
      ctx.resources.users.guild(guildID),
      ctx.resources.users.member(guildID, ctx.authorID),
      ctx.resources.users.member(guildID, ctx.transport.botID),
      ctx.resources.roles.list(guildID),
    ]);
    if (role.position >= topOf(roles, me, guild.ownerID, ctx.transport.botID)) {
      await ctx.reply(`${ctx.emoji.unhappy} Este cargo está acima do meu maior cargo — eu não conseguiria entregá-lo a ninguém...`);
      return;
    }
    if (role.position >= topOf(roles, author, guild.ownerID, ctx.authorID)) {
      await ctx.reply(`${ctx.emoji.unhappy} Este cargo está acima do seu maior cargo — você não pode delegá-lo...`);
      return;
    }

    await ctx.data.guild.set('autorole', role.id);
    setGuildAutoroleCache(guildID, role.id);
    await ctx.reply(`${ctx.emoji.happy} Quem entrar neste servidor agora recebe **${role.name}** automaticamente!`);
  },
});
