export const joinRole = {
  guildId: '1473036495175913548',
  roleId: '1473381708310396982',
} as const;

export function shouldGrantJoinRole(member: { guildId: string; bot: boolean }): boolean {
  return member.guildId === joinRole.guildId && !member.bot;
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
  if (!shouldGrantJoinRole({ guildId: member.guild.id, bot: member.user.bot })) return false;
  if (member.roles.has(joinRole.roleId)) return false;
  await member.roles.add(joinRole.roleId);
  return true;
}
