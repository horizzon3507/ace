import { defineConfig, SDK } from 'yuzuha';
import { grantJoinRole, isBareMention, mentionMessage, prefix, unknownCommandMessage } from './src/live.js';

export default defineConfig({
  name: 'ace',
  prefix: () => prefix(),
  commands: './commands',
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
    bot.on(SDK.Events.MessageCreate, async (message) => {
      const me = bot.client.user;
      if (!me || message.author.bot) return;
      const mentioned = message.mentions.some((user) => user.id === me.id);
      if (isBareMention(message.content, me.id, mentioned)) {
        await message.reply(mentionMessage(prefix()), { ping: false });
        return;
      }
      const names = bot.listCommands().flatMap((command) => [command.name, ...(command.aliases ?? [])]);
      const missing = unknownCommandMessage(message.content, prefix(), names);
      if (missing) await message.reply(missing, { ping: false });
    });

    bot.on(SDK.Events.GuildMemberAdd, (member) => grantJoinRole(member));
  },
});
