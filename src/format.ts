const two = (n: number) => String(n).padStart(2, '0');

/** Carimbo curto pt-BR compartilhado: **DD/MM **às **HH:mm**. */
export function formatStamp(date: Date): string {
  return `**${two(date.getDate())}/${two(date.getMonth() + 1)} **às **${two(date.getHours())}:${two(date.getMinutes())}**`;
}

/** Carimbo com ano: **DD/MM/AAAA **às **HH:mm**. */
export function formatDayStamp(date: Date): string {
  return `**${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()} **às **${two(date.getHours())}:${two(date.getMinutes())}**`;
}

/** Idade aproximada pt-BR: "há **8 meses**". */
export function formatAge(date: Date, now = Date.now()): string {
  const days = Math.floor((now - date.getTime()) / 86_400_000);
  if (days >= 365) {
    const years = Math.floor(days / 365);
    return `há **${years} ${years === 1 ? 'ano' : 'anos'}**`;
  }
  if (days >= 30) {
    const months = Math.floor(days / 30);
    return `há **${months} ${months === 1 ? 'mês' : 'meses'}**`;
  }
  if (days >= 1) return `há **${days} ${days === 1 ? 'dia' : 'dias'}**`;
  return 'há **poucas horas**';
}
