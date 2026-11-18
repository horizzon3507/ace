import { defineCommand } from 'yuzuha';
import { formatStamp } from '../src/live.js';

export { formatStamp };

/** Mantido para quem ainda importa daqui; a casa do carimbo agora é src/format.ts. */
export const formatBootStamp = formatStamp;

function pushUnit(parts: string[], count: number, singular: string, plural: string): void {
  if (count > 0) parts.push(`**${count} ${count === 1 ? singular : plural}**`);
}

export function formatUptime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const parts: string[] = [];
  pushUnit(parts, Math.floor(seconds / 86_400), 'dia', 'dias');
  pushUnit(parts, Math.floor((seconds % 86_400) / 3_600), 'hora', 'horas');
  pushUnit(parts, Math.floor((seconds % 3_600) / 60), 'minuto', 'minutos');
  pushUnit(parts, seconds % 60, 'segundo', 'segundos');

  if (parts.length === 0) return '**alguns segundos**';
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

export default defineCommand({
  name: 'uptime',
  description: 'Há quanto tempo o Ace está acordado.',
  aliases: ['up', 'awake', 'tempo', 'acordado', 'online', 'upt', 'alive', 'vivo', 'tempodevida', 'waketime', 'ligado'],
  cooldown: 3_000,
  examples: ['uptime'],
  async run(ctx) {
    const up = process.uptime();
    const bootedAt = new Date(Date.now() - up * 1000);
    await ctx.reply(`${ctx.emoji.time} Eu estou acordado e na escuta há ${formatUptime(up)} (desde ${formatStamp(bootedAt)})!`);
  },
});
