import { defineCommand, embed } from 'yuzuha';
import { emoji } from '../src/emoji.js';
import { guildPrefix } from '../src/guild-prefix.js';
import { brand, prefix } from '../src/live.js';

type CommandCategory = { emoji: keyof typeof emoji; commands: readonly string[] };

const categories: CommandCategory[] = [
  { emoji: 'information', commands: ['ajuda', 'ping', 'uptime', 'setprefix'] },
  { emoji: 'globe', commands: ['avatar', 'userbanner', 'guildicon', 'guildbanner'] },
  { emoji: 'ban', commands: ['kick', 'ban'] },
];

export default defineCommand({
  name: 'ajuda',
  description: 'Lista os comandos do Ace.',
  aliases: [
    'help', 'commands', 'cmds', 'ajd', 'h', 'menu', 'ajudar',
    'commandslist', 'cmdlist', 'listcommands', 'comandos', 'ajdlist',
    'assist', 'socorro', 'aj', 'helper', 'commandhelp', 'comandoslista',
  ],
  cooldown: '3s',
  async run(ctx) {
    const p = await guildPrefix(ctx.guildID) ?? prefix();
    const descriptions = new Map(
      ctx.help()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const i = line.indexOf(':');
          return i < 0 ? [line.trim(), ''] : [line.slice(0, i).trim(), line.slice(i + 1).trim()];
        }),
    );

    const fields: { name: string; value: string; inline?: boolean }[] = [];
    const listed = new Set<string>();
    const push = (command: string, icon: string) => {
      const description = descriptions.get(command);
      if (description === undefined) return;
      fields.push({ name: `${icon} \`${p}${command}\``, value: description || '​', inline: true });
      listed.add(command);
    };
    for (const category of categories) {
      for (const command of category.commands) push(command, emoji[category.emoji]);
    }
    for (const command of descriptions.keys()) {
      if (!listed.has(command)) push(command, emoji.happy);
    }

    await ctx.reply({
      embeds: [embed({
        color: brand.primary,
        title: `${emoji.commandline} Confira meus comandos`,
        description: 'Heey! Estes são os meus comandos. Não é uma lista infinita, é **uma lista útil**.',
        fields,
      })],
    });
  },
});
