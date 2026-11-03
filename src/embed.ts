import { embed } from 'yuzuha';
import type { AceContext } from './context.js';
import { brand } from './live.js';

export async function replyAsset(ctx: AceContext, name: string, url: string): Promise<void> {
  await ctx.reply({
    embeds: [embed({
      color: brand.primary,
      author: { name, iconURL: url },
      image: { url },
    })],
  });
}
