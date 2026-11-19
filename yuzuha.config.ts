import { defineConfig, SDK, type Command } from 'yuzuha';
import { bindGuildAutoroles } from './src/guild-autorole.js';
import { bindGuildPrefixes, guildPrefix } from './src/guild-prefix.js';
import { grantJoinRole, isBareMention, mentionMessage, prefix, unknownCommandMessage } from './src/live.js';

export default defineConfig({
  name: 'ace',
  owners: ['1473035660161241245'],
  prefix: async (message) => await guildPrefix(message.guildID) ?? prefix(),
  commands: './commands',
  memberCache: { ttlMs: 300_000, max: 1_000 },
  cacheSweepers: { messages: { intervalMs: 300_000, maxAgeMs: 1_800_000 } },
  concurrency: { max: 64, perGuild: 8, maxPending: 256 },
  clientOptions: {
    defaultReplyPing: false,
    defaultAllowedMentions: {
      repliedUser: false,
    },
    presence: {
      status: 'online',
      activities: [
        {
          name: 'Fluxer',
          type: 1,
          url: 'https://twitch.tv/fluxer',
        },
      ],
    },
  },
  setup(bot) {
    bindGuildPrefixes(bot.store);
    bindGuildAutoroles(bot.store);
    let cachedCommands: readonly Command[] = [];
    let cachedNames: readonly string[] = Object.freeze([]);
    const getCommandNames = (): readonly string[] => {
      const current = bot.listCommands();
      if (current.length === cachedCommands.length && current.every((command, index) => command === cachedCommands[index])) {
        return cachedNames;
      }
      const next: string[] = [];
      for (let i = 0; i < current.length; i += 1) {
        const command = current[i]!;
        next.push(command.name);
        if (command.aliases) {
          for (let j = 0; j < command.aliases.length; j += 1) {
            next.push(command.aliases[j]!);
          }
        }
      }
      cachedCommands = current;
      cachedNames = Object.freeze(next);
      return cachedNames;
    };

    bot.on(SDK.Events.MessageCreate, async (message) => {
      const me = bot.client.user;
      if (!me || message.author.bot || !message.content) return;
      const mentioned = message.mentions.some((user) => user.id === me.id);
      if (isBareMention(message.content, me.id, mentioned)) {
        const p = await guildPrefix(message.guildId) ?? prefix();
        await message.reply(mentionMessage(p), { ping: false });
        return;
      }
      const p = await guildPrefix(message.guildId) ?? prefix();
      if (!message.content.startsWith(p)) return;
      const missing = unknownCommandMessage(message.content, p, getCommandNames());
      if (missing) await message.reply(missing, { ping: false });
    });

    bot.on(SDK.Events.GuildMemberAdd, (member) => grantJoinRole(member));
  },
});
