import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function readPackageVersion(relativePath = 'package.json', fallback = '0.0.0'): string {
  const candidates = [join(process.cwd(), relativePath)];
  if (relativePath === 'package.json') {
    candidates.push(fileURLToPath(new URL('../package.json', import.meta.url)));
  }
  for (let i = 0; i < candidates.length; i += 1) {
    try {
      const parsed = JSON.parse(readFileSync(candidates[i]!, 'utf8')) as { version?: string };
      if (parsed.version) return parsed.version;
    } catch {
      // Tenta próximo candidato.
    }
  }
  return fallback;
}

/** Versão do package.json, lida uma vez na carga do módulo (mesmo esquema do cli). */
export const version: string = readPackageVersion();
