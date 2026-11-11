import type { CommandContext, CommandContextLike } from 'yuzuha';

/**
 * Superfície que os helpers do Ace usam — CommandContextLike cobre purge, expire,
 * members, cdn e emoji. 'args' sai porque TypedArguments não satisfaz ArgumentBag
 * (e nada nosso usa ctx.args); requireGuild fica de fora do Pick e entra aqui.
 * client é opcional: fora do Like porque fixtures não precisam dele — serve pra
 * detalhes que o port não expõe (ex.: discriminator de usuário).
 */
export type AceContext = Omit<CommandContextLike, 'args'> & Pick<CommandContext, 'requireGuild'> & { client?: CommandContext['client'] };
