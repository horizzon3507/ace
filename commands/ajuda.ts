import { defineCommand, embed } from 'yuzuha';
import { emoji } from '../src/emoji.js';
import { brand, prefix } from '../src/live.js';

export default defineCommand({
  name: 'ajuda',
  description: 'Lista os comandos do Ace.',
  aliases: [
    'help', 'commands', 'cmds', 'ajd', 'h', 'menu', 'ajudar',
    'commandslist', 'cmdlist', 'listcommands', 'comandos', 'ajdlist',
  ],
  cooldown: '3s',
  async run(ctx) {
    const lines = ctx.help().split('\n').filter(Boolean).map(l => {
      const i = l.indexOf(':');
      return i < 0 ? `\`${prefix()}${l}\`` : `\`${prefix()}${l.slice(0, i)}\` — ${l.slice(i + 1).trim()}`;
    });
    await ctx.reply({
      embeds: [embed({
        color: brand.primary,
        title: `${emoji.information} Comandos`,
        description: lines.join('\n') || 'Nenhum comando disponível.',
      })],
    });
  },
});
