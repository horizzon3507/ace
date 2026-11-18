const WHITESPACE_RE = /\s/;

export function prefix(): string {
  const value = process.env.PREFIX?.trim();
  // Espaço no prefixo derruba o roteamento do yuzuha em toda mensagem.
  return value && !WHITESPACE_RE.test(value) ? value : 'a.';
}
