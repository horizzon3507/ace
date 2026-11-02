import { defineCommand } from 'yuzuha';
import { brand, prefix } from '../src/live.js';

export default defineCommand({
  name: 'ajuda',
  description: 'Lista os comandos do Ace.',
  aliases: [
    'help', 'commands', 'cmds', 'ajd', 'h', 'menu', 'ajudar',
    'commandslist', 'cmdlist', 'listcommands', 'comandos', 'ajdlist',
  ],
  async run(ctx) {
    await ctx.reply({
      embeds: [{
        color: brand.primary,
        description: `${ctx.help()}\n-# Prefixo **${prefix()}**`,
      }],
    });
  },
});