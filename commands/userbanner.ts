import { defineCommand } from 'yuzuha';
import { replyUserAsset } from '../src/embed.js';

export default defineCommand({
  name: 'userbanner',
  description: 'Exibe o banner de um usuário.',
  aliases: [
    'ub', 'userbnr', 'ubnr', 'banner', 'profilebanner', 'pbanner',
    'usercover', 'cover', 'ubg', 'bann', 'userbanners',
    'usbanner', 'ubanner', 'banneruser', 'ubn', 'userbg', 'profilebg',
  ],
  run: (ctx) => replyUserAsset(ctx, 'banner'),
});
