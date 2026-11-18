import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

function resolveVersion(): string {
  for (const candidate of [
    join(process.cwd(), 'package.json'),
    fileURLToPath(new URL('../package.json', import.meta.url)),
  ]) {
    try {
      const parsed = JSON.parse(readFileSync(candidate, 'utf8')) as { version?: string };
      if (parsed.version) return parsed.version;
    } catch {
      // Tenta próximo candidato.
    }
  }
  return '0.0.0';
}

/** Versão do package.json, lida uma vez na carga do módulo (mesmo esquema do cli). */
export const version: string = resolveVersion();
