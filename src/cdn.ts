/** Sem `?size` o CDN devolve a miniatura. Força a resolução máxima do asset. */
export function fullAssetSize(url: string): string {
  const q = url.indexOf('?');
  const params = new URLSearchParams(q < 0 ? '' : url.slice(q + 1));
  params.set('size', '4096');
  return `${q < 0 ? url : url.slice(0, q)}?${params}`;
}

/**
 * Corrige URLs de assets animados (hash `a_`) trocando a extensão para `.gif`.
 * O bug é só nos assets de servidor: o SDK monta ícone/banner de guilda sempre
 * com `.png`. Avatar/banner de usuário já saem com `.gif` correto.
 */
export function fixAnimatedAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Encontra o último segmento de path (nome do arquivo) antes de query/hash.
  const queryIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');
  const cut = Math.min(
    queryIndex === -1 ? url.length : queryIndex,
    hashIndex === -1 ? url.length : hashIndex,
  );
  const path = url.slice(0, cut);
  const suffix = url.slice(cut);
  const slash = path.lastIndexOf('/');
  const file = slash === -1 ? path : path.slice(slash + 1);
  // hash animado começa com "a_"
  if (!file.startsWith('a_')) return url;
  // troca a extensão final (.png/.webp/.jpg) por .gif
  const fixedFile = file.replace(/\.(png|webp|jpg|jpeg)$/i, '.gif');
  if (fixedFile === file) return url;
  const fixedPath = slash === -1 ? fixedFile : path.slice(0, slash + 1) + fixedFile;
  return fixedPath + suffix;
}