import type { CommandContext } from 'yuzuha';

/** Superfície que os comandos nativos realmente expõem. Evita o tipo da classe, que o handler não satisfaz. */
export type AceContext = {
  readonly message: CommandContext['message'];
  readonly tokens: readonly string[];
  readonly transport: CommandContext['transport'];
  readonly authorID: string;
  readonly authorName: CommandContext['authorName'];
  readonly channelID: CommandContext['channelID'];
  readonly input: string;
  readonly resources: CommandContext['resources'];
  readonly mod: CommandContext['mod'];
  readonly help: CommandContext['help'];
  requireGuild: CommandContext['requireGuild'];
  reply: CommandContext['reply'];
  requirePermission: CommandContext['requirePermission'];
  moderate: CommandContext['moderate'];
};
