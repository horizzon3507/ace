import { defineCommand } from 'yuzuha';
import { emoji } from '../src/emoji.js';
import { setGuildPrefixCache } from '../src/guild-prefix.js';
import { prefix } from '../src/live.js';

export default defineCommand({
  name: 'setprefix',
  description: 'Muda o prefixo do Ace neste servidor.',
  aliases: ['prefixo', 'setarprefixo', 'mudarprefixo', 'prefix', 'mudaprefixo', 'trocarprefixo', 'novoprefixo', 'sp', 'prefixset'],
  guildOnly: true,
  permissions: ['ManageGuild'],
  cooldown: '3s',
  examples: ['a.setprefix !', 'a.setprefix reset'],
  async run(ctx) {
    const guildID = ctx.requireGuild();
    const next = ctx.tokens[0];
    if (!next) {
      await ctx.reply(`${emoji.information} Você precisa **me fornecer** um prefixo novo para eu definir neste ambiente!`);
      return;
    }
    if (/^(reset|padr[aã]o|default)$/i.test(next)) {
      await ctx.data.guild.delete('prefix');
      setGuildPrefixCache(guildID, undefined);
      await ctx.reply(`${emoji.happy} Prefixo do servidor voltou para \`${prefix()}\`.`);
      return;
    }
    if (next.length > 10) {
      await ctx.reply(`${emoji.unhappy} Este prefixo é **muito longo**! Use até **10 caracteres**, sem espaços.`);
      return;
    }
    await ctx.data.guild.set('prefix', next);
    setGuildPrefixCache(guildID, next);
    await ctx.reply(`${emoji.happy} Prefixo do servidor agora é \`${next}\`.`);
  },
});
