import { defineCommand, embed } from 'yuzuha';
import { emoji } from '../src/emoji.js';
import { guildPrefix } from '../src/guild-prefix.js';
import { brand, prefix } from '../src/live.js';

type CommandCategory = { name: string; emoji: keyof typeof emoji; commands: readonly string[] };

const categories: CommandCategory[] = [
  { name: 'Geral', emoji: 'information', commands: ['ajuda', 'ping', 'uptime'] },
  { name: 'Utilidades', emoji: 'globe', commands: ['avatar', 'userbanner', 'guildicon', 'guildbanner'] },
  { name: 'Moderação', emoji: 'ban', commands: ['kick', 'ban'] },
  { name: 'Servidor', emoji: 'happy', commands: ['setprefix'] },
];

export default defineCommand({
  name: 'ajuda',
  description: 'Lista os comandos do Ace.',
  aliases: [
    'help', 'commands', 'cmds', 'ajd', 'h', 'menu', 'ajudar',
    'commandslist', 'cmdlist', 'listcommands', 'comandos', 'ajdlist',
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
    const pushCategory = (name: string, icon: string, commands: readonly string[]) => {
      const entries = commands
        .map((command) => [command, descriptions.get(command)] as const)
        .filter((entry): entry is readonly [string, string] => entry[1] !== undefined);
      if (!entries.length) return;
      fields.push({ name: `${icon} ${name}`, value: '​' });
      for (const [command, description] of entries) {
        fields.push({ name: `\`${p}${command}\``, value: description || '​', inline: true });
        listed.add(command);
      }
    };
    for (const category of categories) {
      pushCategory(category.name, emoji[category.emoji], category.commands);
    }
    const rest = [...descriptions.keys()].filter((command) => !listed.has(command));
    if (rest.length) pushCategory('Outros', emoji.happy, rest);

    await ctx.reply({
      embeds: [embed({
        color: brand.primary,
        title: `${emoji.information} Veja meus comandos!`,
        description: 'Heey! Estes são os meus comandos. Não é uma lista infinita, é **uma lista útil**.',
        fields,
        footer: { text: `Prefixo ${p} • Ace` },
      })],
    });
  },
});
