import { defineCommand, type RoleInfo } from 'yuzuha';
import { guildAutorole, setGuildAutoroleCache, type AutoroleCategory, type AutoroleConfig } from '../src/guild-autorole.js';
import { guildPrefix } from '../src/guild-prefix.js';
import { autoroleCategory } from '../src/join-role.js';
import { prefix } from '../src/live.js';

const ADMIN = 0x8n;
const MAX_ROLES = 15;
const RESET = /^(reset|off|limpar|remover|desligar)$/i;
const CATEGORIES: AutoroleCategory[] = ['all', 'user', 'app'];

const categories: Record<string, AutoroleCategory> = {
  all: 'all', todos: 'all', tudo: 'all', ambos: 'all',
  user: 'user', usuario: 'user', usuarios: 'user', membro: 'user', membros: 'user', humano: 'user', humanos: 'user',
  app: 'app', apps: 'app', bot: 'app', bots: 'app', aplicativo: 'app', aplicativos: 'app',
};
const labels: Record<AutoroleCategory, string> = { all: 'Todos', user: 'Usuários', app: 'Apps' };

type MemberRef = { roles: string[]; permissions: string };

/** Maior posição do membro; Administrator e dono do servidor passam por cima de tudo. */
const topOf = (roles: readonly { id: string; position: number }[], member: MemberRef, ownerID: string, userID: string): number =>
  userID === ownerID || (BigInt(member.permissions) & ADMIN) !== 0n
    ? Number.MAX_SAFE_INTEGER
    : Math.max(0, ...roles.filter((role) => member.roles.includes(role.id)).map((role) => role.position));

const mention = (ids: readonly string[]): string =>
  ids.length ? ids.map((id) => `<@&${id}>`).join(' ') : 'desligado';

export default defineCommand({
  name: 'autorole',
  description: 'Cargos automáticos pra quem entra no servidor.',
  aliases: ['joinrole', 'autocargo', 'cargoautomatico', 'cargodeentrada', 'cargauto', 'autojoinrole'],
  guildOnly: true,
  permissions: ['ManageRoles'],
  botPermissions: ['ManageRoles'],
  cooldown: '3s',
  examples: ['a.autorole user @Membro @Vip', 'a.autorole reset all'],
  async run(ctx) {
    const guildID = ctx.requireGuild();
    const p = await guildPrefix(ctx.guildID) ?? prefix();
    const [action, ...rest] = ctx.tokens;
    const usage = `${ctx.emoji.unhappy} Me informe a categoria: \`all\` (todos), \`user\` (usuários) ou \`app\` (bots)...\n-# ╰ Ex: \`${p}autorole user @Membros\``;

    const line = async (category: AutoroleCategory): Promise<string> =>
      `${ctx.emoji.dot} **${labels[category]}**: ${mention(autoroleCategory(await guildAutorole(guildID), guildID, category))}`;

    if (!action) {
      const lines = await Promise.all(CATEGORIES.map(line));
      await ctx.reply([
        `${ctx.emoji.team} Autorole deste servidor:`,
        ...lines,
        `-# ╰ Configure com \`${p}autorole <all|user|app> <cargos>\` — limpe com \`${p}autorole reset <categoria>\``,
      ].join('\n'));
      return;
    }

    if (RESET.test(action)) {
      const target = categories[(rest[0] ?? '').toLowerCase()];
      if (!target) {
        await ctx.reply(`${ctx.emoji.unhappy} Me informe a categoria a limpar: \`all\`, \`user\` ou \`app\`...\n-# ╰ Ex: \`${p}autorole reset user\``);
        return;
      }
      const config: AutoroleConfig = { ...(await guildAutorole(guildID) ?? {}), [target]: 'off' };
      await ctx.data.guild.set('autorole', config);
      setGuildAutoroleCache(guildID, config);
      await ctx.reply(`${ctx.emoji.happy} Autorole de **${labels[target]}** desligado!`);
      return;
    }

    const category = categories[action.toLowerCase()];
    if (!category) {
      await ctx.reply(usage);
      return;
    }
    if (!rest.length) {
      await ctx.reply(await line(category));
      return;
    }
    if (rest.length > MAX_ROLES) {
      await ctx.reply(`${ctx.emoji.unhappy} São até ${MAX_ROLES} cargos por categoria — você mandou ${rest.length}...`);
      return;
    }

    const resolved: RoleInfo[] = [];
    for (const token of rest) {
      try {
        resolved.push(await ctx.resources.roles.resolve(guildID, token));
      } catch {
        await ctx.reply(`${ctx.emoji.unhappy} Eu não encontrei nenhum cargo como ${token}! Use menção, ID ou nome exato...`);
        return;
      }
    }
    for (const role of resolved) {
      if (role.managed || role.id === guildID) {
        await ctx.reply(`${ctx.emoji.unhappy} O cargo **${role.name}** eu não consigo entregar — ele é do @everyone ou gerenciado por uma integração...`);
        return;
      }
    }

    const [guild, author, me, roles] = await Promise.all([
      ctx.resources.users.guild(guildID),
      ctx.resources.users.member(guildID, ctx.authorID),
      ctx.resources.users.member(guildID, ctx.transport.botID),
      ctx.resources.roles.list(guildID),
    ]);
    const botTop = topOf(roles, me, guild.ownerID, ctx.transport.botID);
    const authorTop = topOf(roles, author, guild.ownerID, ctx.authorID);
    for (const role of resolved) {
      if (role.position >= botTop) {
        await ctx.reply(`${ctx.emoji.unhappy} O cargo **${role.name}** está acima do meu maior cargo — eu não conseguiria entregá-lo...`);
        return;
      }
      if (role.position >= authorTop) {
        await ctx.reply(`${ctx.emoji.unhappy} O cargo **${role.name}** está acima do seu maior cargo — você não pode delegá-lo...`);
        return;
      }
    }

    const ids = [...new Set(resolved.map((role) => role.id))];
    const config: AutoroleConfig = { ...(await guildAutorole(guildID) ?? {}), [category]: ids };
    await ctx.data.guild.set('autorole', config);
    setGuildAutoroleCache(guildID, config);
    await ctx.reply(`${ctx.emoji.happy} Autorole de **${labels[category]}** configurado: ${ids.map((id) => `<@&${id}>`).join(' ')}!`);
  },
});
