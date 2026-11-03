import { defineCommand } from 'yuzuha';
import { emoji } from '../src/emoji.js';
import { guildPrefix, setGuildPrefixCache } from '../src/guild-prefix.js';
import { prefix } from '../src/live.js';

export default defineCommand({
  name: 'setprefix',
  description: 'Muda o prefixo do Ace neste servidor.',
  aliases: ['prefixo', 'setarprefixo', 'mudarprefixo'],
  guildOnly: true,
  permissions: ['ManageGuild'],
  cooldown: '3s',
  examples: ['a.setprefix !', 'a.setprefix reset'],
  async run(ctx) {
    const guildID = ctx.requireGuild();
    const next = ctx.tokens[0];
    if (!next) {
      const current = await guildPrefix(guildID) ?? prefix();
      await ctx.reply(`${emoji.information} O prefixo neste servidor é \`${current}\`.\n-# ╰ Use \`${current}setprefix <novo>\` para trocar ou \`${current}setprefix reset\` para voltar ao padrão.`);
      return;
    }
    if (/^(reset|padr[aã]o|default)$/i.test(next)) {
      await ctx.data.guild.delete('prefix');
      setGuildPrefixCache(guildID, undefined);
      await ctx.reply(`${emoji.happy} Prefixo do servidor voltou para \`${prefix()}\`.`);
      return;
    }
    if (next.length > 10) {
      await ctx.reply(`${emoji.unhappy} Prefixo muito longo. Use até 10 caracteres sem espaços.`);
      return;
    }
    await ctx.data.guild.set('prefix', next);
    setGuildPrefixCache(guildID, next);
    await ctx.reply(`${emoji.happy} Prefixo do servidor agora é \`${next}\`.`);
  },
});
