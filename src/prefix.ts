export function prefix(): string {
  const value = process.env.PREFIX?.trim();
  return value ? value : 'a.';
}
