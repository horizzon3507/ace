const two = (n: number) => String(n).padStart(2, '0');

/** Carimbo curto pt-BR compartilhado: **DD/MM **às **HH:mm**. */
export function formatStamp(date: Date): string {
  return `**${two(date.getDate())}/${two(date.getMonth() + 1)} **às **${two(date.getHours())}:${two(date.getMinutes())}**`;
}
