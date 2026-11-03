export function prefix(): string {
  const value = process.env.PREFIX?.trim();
  // Espaço no prefixo derruba o roteamento do yuzuha em toda mensagem.
  return value && !/\s/.test(value) ? value : 'a.';
}
