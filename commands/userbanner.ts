import { defineCommand } from 'yuzuha';
import { replyUserAsset } from '../src/live.js';

export default defineCommand({
  name: 'userbanner',
  description: 'Exibe o banner de um usuário.',
  aliases: Object.freeze([
    'ub', 'userbnr', 'ubnr', 'banner', 'profilebanner', 'pbanner',
    'usercover', 'cover', 'ubg', 'bann', 'userbanners',
    'usbanner', 'ubanner', 'banneruser', 'ubn', 'userbg', 'profilebg',
  ]) as string[],
  examples: Object.freeze(['userbanner', 'userbanner @usuario']) as string[],
  run: (ctx) => replyUserAsset(ctx, 'banner'),
});
