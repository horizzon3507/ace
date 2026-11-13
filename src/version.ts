import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Versão do package.json, lida uma vez na carga do módulo (mesmo esquema do cli). */
export const version: string = (() => {
  try {
    const parsed = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { version?: string };
    return parsed.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
})();
