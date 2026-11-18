import { defineCommand } from 'yuzuha';
import { replyUserInfo } from '../src/live.js';

export default defineCommand({
  name: 'userinfo',
  description: 'Mostra informações de um usuário.',
  aliases: ['whois', 'user', 'memberinfo', 'uinfo', 'infouser', 'usermembro', 'membroinfo'],
  guildOnly: true,
  cooldown: 3_000,
  examples: ['userinfo', 'userinfo @usuario'],
  run: (ctx) => replyUserInfo(ctx),
});
