import { defineCommand } from 'yuzuha';
import { emoji } from '../src/emoji.js';
import { formatStamp } from '../src/format.js';

export { formatStamp };

/** Mantido para quem ainda importa daqui; a casa do carimbo agora é src/format.ts. */
export const formatBootStamp = formatStamp;

export function formatUptime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const parts = ([
    [Math.floor(seconds / 86400), 'dia', 'dias'],
    [Math.floor((seconds % 86400) / 3600), 'hora', 'horas'],
    [Math.floor((seconds % 3600) / 60), 'minuto', 'minutos'],
    [seconds % 60, 'segundo', 'segundos'],
  ] as const)
    .filter(([n]) => n > 0)
    .map(([n, singular, plural]) => `**${n} ${n === 1 ? singular : plural}**`);

  if (parts.length === 0) return '**alguns segundos**';
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}`;
}

export default defineCommand({
  name: 'uptime',
  description: 'Há quanto tempo o Ace está acordado.',
  aliases: ['up', 'awake', 'tempo', 'acordado', 'online', 'upt', 'alive', 'vivo', 'tempodevida', 'waketime', 'ligado'],
  cooldown: '3s',
  async run(ctx) {
    const up = process.uptime();
    const bootedAt = new Date(Date.now() - up * 1000);
    await ctx.reply(`${emoji.time} Eu estou acordado e na escuta há ${formatUptime(up)} (desde ${formatStamp(bootedAt)})!`);
  },
});
