import { defineCommand } from 'yuzuha';
import { replyUserAsset } from '../src/embed.js';

export default defineCommand({
  name: 'avatar',
  description: 'Exibe o avatar de um usuário.',
  aliases: [
    'av', 'pfp', 'profilepic', 'useravatar', 'userpfp', 'foto', 'fotoperfil',
    'avtr', 'dp', 'displaypic', 'userpic', 'memberavatar', 'mav',
    'ui', 'ua', 'upfp', 'usericon', 'userav',
  ],
  run: (ctx) => replyUserAsset(ctx, 'avatar'),
});
