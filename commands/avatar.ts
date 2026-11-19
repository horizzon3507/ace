import { defineCommand } from 'yuzuha';
import { replyUserAsset } from '../src/live.js';

export default defineCommand({
  name: 'avatar',
  description: 'Exibe o avatar de um usuário.',
  aliases: Object.freeze([
    'av', 'pfp', 'profilepic', 'useravatar', 'userpfp', 'foto', 'fotoperfil',
    'avtr', 'dp', 'displaypic', 'userpic', 'memberavatar', 'mav',
    'ui', 'ua', 'upfp', 'usericon', 'userav',
    'pic', 'avt', 'picture', 'perfil', 'avpic', 'pfpic',
  ]) as string[],
  examples: Object.freeze(['avatar', 'avatar @usuario']) as string[],
  run: (ctx) => replyUserAsset(ctx, 'avatar'),
});
