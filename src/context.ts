import type { CommandContext, CommandContextLike } from 'yuzuha';

/**
 * Superfície que os helpers do Ace usam — CommandContextLike cobre purge, expire,
 * members, cdn e emoji. 'args' sai porque TypedArguments não satisfaz ArgumentBag
 * (e nada nosso usa ctx.args); requireGuild fica de fora do Pick e entra aqui.
 */
export type AceContext = Omit<CommandContextLike, 'args'> & Pick<CommandContext, 'requireGuild'>;
