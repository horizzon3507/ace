import { defineCommand } from 'yuzuha';
import { replyUserInfo } from '../src/info.js';

export default defineCommand({
  name: 'userinfo',
  description: 'Mostra informações de um usuário.',
  aliases: ['whois', 'user', 'memberinfo', 'uinfo', 'infouser', 'usermembro', 'membroinfo'],
  guildOnly: true,
  cooldown: '3s',
  run: (ctx) => replyUserInfo(ctx),
});
