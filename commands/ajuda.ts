import { defineCommand, embed, type Embed } from 'yuzuha';
import type { emoji as catalog } from '../src/emoji.js';
import { guildPrefix } from '../src/guild-prefix.js';
import { brand, prefix, startPaginator } from '../src/live.js';
import { version } from '../src/version.js';
import { formatUptime } from './uptime.js';

type EmojiKey = keyof typeof catalog;
type Category = { icon: EmojiKey; label: string; commands: readonly string[] };

const categories: Category[] = [
  { icon: 'ban', label: 'Moderação', commands: ['kick', 'ban', 'softban', 'lock', 'unlock', 'clear', 'purge', 'timeout', 'unban'] },
  { icon: 'information', label: 'Informações', commands: ['ajuda', 'ping', 'uptime', 'setprefix', 'userinfo', 'guildinfo', 'autorole'] },
  { icon: 'globe', label: 'Utilidades', commands: ['avatar', 'userbanner', 'guildicon', 'guildbanner', 'emojilist', 'emojidump'] },
];

// Ícone por comando quando um encaixa melhor que o da categoria.
const commandIcons: Record<string, EmojiKey> = {
  ajuda: 'information', ping: 'globe', uptime: 'time', setprefix: 'settings',
  userinfo: 'accountCircle', guildinfo: 'idCard',
  avatar: 'accountBox', userbanner: 'stickyNote', guildicon: 'medal', guildbanner: 'shining',
  emojilist: 'sparkling', emojidump: 'sparkling',
  kick: 'kick', ban: 'ban', softban: 'ban', lock: 'lock', unlock: 'unlock',
  clear: 'purge', purge: 'purge', timeout: 'time', unban: 'unban', autorole: 'team',
};

// Exemplos mostrados no ajuda, sem prefixo — renderizados com o do servidor.
// Espelho do metadata `examples` dos comandos (o ctx não expõe os demais);
// o teste de consistência cobre drift entre os dois.
export const commandExamples: Record<string, readonly string[]> = {
  ajuda: ['ajuda 2'],
  setprefix: ['setprefix !', 'setprefix reset'],
  autorole: ['autorole user @Membro @Vip', 'autorole reset all'],
  kick: ['kick @usuario spam'],
  ban: ['ban @usuario spam'],
  softban: ['softban @usuario spam'],
  lock: ['lock', 'lock #geral flood'],
  unlock: ['unlock', 'unlock #geral'],
  clear: ['clear 20'],
  purge: ['purge @usuario', 'purge @usuario 25'],
  timeout: ['timeout @usuario 10m spam'],
  unban: ['unban @usuario', 'unban 1234567890123 se arrependeu'],
  emojidump: ['emojidump'],
};

export default defineCommand({
  name: 'ajuda',
  description: 'Lista os comandos do Ace.',
  aliases: [
    'help', 'commands', 'cmds', 'ajd', 'h', 'menu', 'ajudar',
    'commandslist', 'cmdlist', 'listcommands', 'comandos', 'ajdlist',
    'assist', 'socorro', 'aj', 'helper', 'commandhelp', 'comandoslista',
  ],
  cooldown: '3s',
  examples: ['ajuda 2'],
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

    const listed = new Set<string>();
    const pages: { label: string; icon: EmojiKey; fields: { name: string; value: string; inline?: boolean }[] }[] = [];
    // Descrição + exemplo(s) na mesma field: `Ex: a.foo bar` com o prefixo do servidor.
    const fieldValue = (command: string, description: string): string => {
      const examples = commandExamples[command];
      const usage = examples?.length ? `\n╰ Ex: ${examples.map((ex) => `\`${p}${ex}\``).join(' · ')}` : '';
      return `${description || '​'}${usage}`;
    };
    for (const { icon, label, commands } of categories) {
      const fields: { name: string; value: string; inline?: boolean }[] = [];
      for (const command of commands) {
        const description = descriptions.get(command);
        if (description === undefined) continue;
        listed.add(command);
        const key = commandIcons[command] ?? icon;
        fields.push({ name: `${ctx.emoji[key]} \`${p}${command}\``, value: fieldValue(command, description), inline: true });
      }
      if (fields.length) pages.push({ label, icon, fields });
    }

    const rest: { name: string; value: string; inline?: boolean }[] = [];
    for (const [command, description] of descriptions) {
      if (listed.has(command)) continue;
      const key = commandIcons[command] ?? 'happy';
      rest.push({ name: `${ctx.emoji[key]} \`${p}${command}\``, value: fieldValue(command, description), inline: true });
    }
    if (rest.length) pages.push({ label: 'Outros', icon: 'happy', fields: rest });

    const total = pages.length + 1;
    const requested = ctx.tokens[0];
    let startPage = 0;
    if (requested !== undefined) {
      const n = /^\d+$/.test(requested) ? Number.parseInt(requested, 10) : 0;
      if (n < 1 || n > total) {
        await ctx.reply(`${ctx.emoji.unhappy} Essa página não existe! O ajuda vai de 1 a ${total}...\n-# ╰ Ex: \`${p}ajuda 2\``);
        return;
      }
      startPage = n - 1;
    }
    const home = embed({
      color: brand.primary,
      title: `${ctx.emoji.home} Ace`,
      description: [
        'Heey! Eu sou o **Ace**! Eu seguro a **moderação** com kicks, bans, timeouts e limpeza de mensagens, te conto tudo sobre **usuários** e este **servidor**, busco artes como **avatares** e **banners** e listo e empacoto os **emojis** daqui...',
        '',
        `${ctx.emoji.dot} Prefixo: \`${p}\``,
        `${ctx.emoji.dot} Comandos: **${descriptions.size}**`,
        `${ctx.emoji.dot} Versão: \`${version}\``,
        `${ctx.emoji.dot} Acordado: há ${formatUptime(process.uptime())}`,
        `${ctx.emoji.dot} Detentor: <@1473035660161241245>`,
      ].join('\n'),
      footer: { text: `Página 1 de ${total} — Sobre mim` },
    });
    const embeds: Embed[] = [
      home,
      ...pages.map((page, i) => embed({
        color: brand.primary,
        title: `${ctx.emoji[page.icon]} ${page.label}`,
        fields: page.fields,
        footer: { text: `Página ${i + 2} de ${total} — Confira meus comandos` },
      })),
    ];
    await startPaginator(ctx, embeds, { startPage });
  },
});
