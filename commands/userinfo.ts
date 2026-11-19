import { defineCommand } from 'yuzuha';
import { replyUserInfo } from '../src/live.js';

export default defineCommand({
  name: 'userinfo',
  description: 'Mostra informações de um usuário.',
  aliases: Object.freeze(['whois', 'user', 'memberinfo', 'uinfo', 'infouser', 'usermembro', 'membroinfo']) as string[],
  guildOnly: true,
  cooldown: 3_000,
  examples: Object.freeze(['userinfo', 'userinfo @usuario']) as string[],
  run: (ctx) => replyUserInfo(ctx),
});
