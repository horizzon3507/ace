import { guildAutorole, type AutoroleCategory, type AutoroleConfig } from './guild-autorole.js';

// Par fixo do servidor original — padrão do 'all' enquanto nada foi configurado.
export const joinRole = {
  guildId: '1473036495175913548',
  roleId: '1473381708310396982',
} as const;

/** Cargos efetivos de uma categoria; o par fixo cobre o 'all' não configurado do servidor original. */
export function autoroleCategory(config: AutoroleConfig | undefined, guildID: string, category: AutoroleCategory): string[] {
  const value = config?.[category];
  if (value === undefined) {
    return category === 'all' && guildID === joinRole.guildId ? [joinRole.roleId] : [];
  }
  return value === 'off' ? [] : value;
}

/** Cargos de entrada efetivos: all+user pra humano, all+app pra bot. */
export async function joinRolesFor(guildID: string, bot: boolean): Promise<string[]> {
  const config = await guildAutorole(guildID);
  return [...new Set([
    ...autoroleCategory(config, guildID, 'all'),
    ...autoroleCategory(config, guildID, bot ? 'app' : 'user'),
  ])];
}

export type JoinMember = {
  guild: { id: string };
  user: { bot: boolean };
  roles: {
    has(roleId: string): boolean;
    add(roleId: string): Promise<void>;
  };
};

export async function grantJoinRole(member: JoinMember): Promise<boolean> {
  const roleIds = await joinRolesFor(member.guild.id, member.user.bot);
  let granted = false;
  for (const roleId of roleIds) {
    if (member.roles.has(roleId)) continue;
    await member.roles.add(roleId);
    granted = true;
  }
  return granted;
}
