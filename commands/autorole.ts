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
  all: 'all', todos: 'all', tudo: 'all',
  user: 'user', usuario: 'user', usuarios: 'user', membro: 'user', membros: 'user',
  app: 'app', apps: 'app', bot: 'app', bots: 'app',
};
const labels: Record<AutoroleCategory, string> = { all: 'Todos', user: 'Usuários', app: 'Apps' };

type MemberRef = { roles: string[]; permissions: string };

/** Maior posição do membro; Administrator e dono do servidor passam por cima de tudo. */
function topOf(roles: readonly { id: string; position: number }[], member: MemberRef, ownerID: string, userID: string): number {
  if (userID === ownerID || (BigInt(member.permissions) & ADMIN) !== 0n) {
    return Number.MAX_SAFE_INTEGER;
  }
  const owned = new Set(member.roles);
  let highest = 0;
  for (let i = 0; i < roles.length; i += 1) {
    const role = roles[i]!;
    if (owned.has(role.id) && role.position > highest) highest = role.position;
  }
  return highest;
}

const mention = (ids: readonly string[]): string =>
  ids.length ? ids.map((id) => `<@&${id}>`).join(' ') : 'desligado';

export default defineCommand({
  name: 'autorole',
  description: 'Cargos automáticos pra quem entra no servidor.',
  aliases: ['joinrole', 'autocargo', 'autojoinrole'],
  guildOnly: true,
  permissions: ['ManageRoles'],
  botPermissions: ['ManageRoles'],
  cooldown: 3_000,
  examples: ['autorole user @Membro @Vip', 'autorole reset all'],
  async run(ctx) {
    const guildID = ctx.requireGuild();
    const p = await guildPrefix(ctx.guildID) ?? prefix();
    const [action, ...rest] = ctx.tokens;
    const usage = `${ctx.emoji.unhappy} Me informe a categoria: \`all\` (todos), \`user\` (usuários) ou \`app\` (bots)...\n-# ╰ Ex: \`${p}autorole user @Membros\``;

    // Config lida uma vez: listagem, reset e gravação partem da mesma base.
    const current = (await guildAutorole(guildID)) ?? {};
    const save = async (config: AutoroleConfig): Promise<void> => {
      await ctx.data.guild.set('autorole', config);
      setGuildAutoroleCache(guildID, config);
    };
    const line = (category: AutoroleCategory): string =>
      `${ctx.emoji.dot} **${labels[category]}**: ${mention(autoroleCategory(current, guildID, category))}`;

    if (!action) {
      await ctx.reply([
        `${ctx.emoji.team} O Autorole deste servidor está configurado para...`,
        ...CATEGORIES.map(line),
        `-# ╰ Configure com \`${p}autorole <all|user|app> <cargos>\` | Limpe com \`${p}autorole reset <categoria>\``,
      ].join('\n'));
      return;
    }

    if (RESET.test(action)) {
      const target = categories[(rest[0] ?? '').toLowerCase()];
      if (!target) {
        // `a.autorole off` puro desliga tudo de uma vez — herança da versão de
        // um cargo só, onde 'off' bastava.
        if (!rest.length) {
          await save({ all: 'off', user: 'off', app: 'off' });
          await ctx.reply(`${ctx.emoji.happy} Autorole desligado por completo!`);
          return;
        }
        await ctx.reply(`${ctx.emoji.unhappy} Me informe a categoria a limpar: \`all\`, \`user\` ou \`app\`...\n-# ╰ Ex: \`${p}autorole reset user\``);
        return;
      }
      await save({ ...current, [target]: 'off' });
      await ctx.reply(`${ctx.emoji.happy} Autorole de **${labels[target]}** desligado!`);
      return;
    }

    const category = categories[action.toLowerCase()];
    if (!category) {
      await ctx.reply(usage);
      return;
    }
    if (!rest.length) {
      await ctx.reply(line(category));
      return;
    }
    if (rest.length > MAX_ROLES) {
      await ctx.reply(`${ctx.emoji.unhappy} São até ${MAX_ROLES} cargos por categoria! Você mandou ${rest.length}...`);
      return;
    }

    const resolved: RoleInfo[] = [];
    const seenTokens = new Set<string>();
    for (let i = 0; i < rest.length; i += 1) {
      const token = rest[i]!;
      if (seenTokens.has(token)) continue;
      seenTokens.add(token);
      try {
        resolved.push(await ctx.resources.roles.resolve(guildID, token));
      } catch {
        await ctx.reply(`${ctx.emoji.unhappy} Eu não encontrei nenhum cargo como ${token}! Use menção, ID ou nome exato...`);
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
      if (role.managed || role.id === guildID) {
        await ctx.reply(`${ctx.emoji.unhappy} O cargo **${role.name}** eu não consigo entregar! Ele é do @everyone ou é gerenciado por uma integração...`);
        return;
      }
      if (role.position >= botTop) {
        await ctx.reply(`${ctx.emoji.unhappy} O cargo **${role.name}** está acima do meu maior cargo! Eu não conseguiria entregá-lo...`);
        return;
      }
      if (role.position >= authorTop) {
        await ctx.reply(`${ctx.emoji.unhappy} O cargo **${role.name}** está acima do seu maior cargo! Você não pode delegá-lo...`);
        return;
      }
    }

    const ids = [...new Set(resolved.map((role) => role.id))];
    await save({ ...current, [category]: ids });
    await ctx.reply(`${ctx.emoji.happy} Autorole de **${labels[category]}** configurado: ${ids.map((id) => `<@&${id}>`).join(' ')}!`);
  },
});
