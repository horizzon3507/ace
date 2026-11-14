import { guildAutorole } from './guild-autorole.js';

// Par fixo do servidor original — padrão enquanto `a.autorole` não configura nada.
export const joinRole = {
  guildId: '1473036495175913548',
  roleId: '1473381708310396982',
} as const;

/** Cargo de entrada efetivo: o configurado por `a.autorole`, 'off' desliga e o par fixo cobre o servidor original. */
export async function joinRoleFor(guildID: string): Promise<string | undefined> {
  const stored = await guildAutorole(guildID);
  if (stored === 'off') return undefined;
  return stored ?? (guildID === joinRole.guildId ? joinRole.roleId : undefined);
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
  if (member.user.bot) return false;
  const roleId = await joinRoleFor(member.guild.id);
  if (!roleId || member.roles.has(roleId)) return false;
  await member.roles.add(roleId);
  return true;
}
