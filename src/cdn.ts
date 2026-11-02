/**
 * Corrige URLs de assets animados do Fluxer/Discord.
 *
 * O SDK (@fluxerjs) monta a URL de ícones/banners de servidor sempre com
 * extensão `.png`, mesmo quando o hash começa com `a_` (asset animado, GIF).
 * Isso quebra a exibição de ícones/banners animados. Esta função troca a
 * extensão para `.gif` nesses casos.
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