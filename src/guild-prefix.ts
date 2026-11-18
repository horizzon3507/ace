import type { Store } from 'yuzuha';

const NAME = 'prefix';
const MISSING = '';
const MAX_CACHE = 2_000;
const WHITESPACE_RE = /\s/;

// O store e o cache ficam fora de RUNTIME_FILES: o import estático sobrevive ao
// hot-reload e a sessão não perde a conexão com o store nem o cache aquecido.
let store: Store | undefined;
const cache = new Map<string, string>();

function writeCache(guildID: string, value: string): void {
  if (cache.has(guildID)) {
    cache.delete(guildID);
  } else if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(guildID, value);
}

export function bindGuildPrefixes(next: Store): void {
  store = next;
}

// Mesma chave do variableKey do yuzuha: [escopo, sujeito, nome] em JSON.
const variableKey = (guildID: string): string => JSON.stringify(['guild', guildID, NAME]);

export async function guildPrefix(guildID: string | null | undefined): Promise<string | undefined> {
  if (!guildID) return undefined;
  const hit = cache.get(guildID);
  if (hit !== undefined) {
    cache.delete(guildID);
    cache.set(guildID, hit);
    return hit === MISSING ? undefined : hit;
  }
  if (!store) return undefined;
  const stored = store.readVariable
    ? await store.readVariable(variableKey(guildID), Date.now)
    : await store.read((state) => state.variables[variableKey(guildID)]);
  const resolved = typeof stored === 'string' && stored.trim() && !WHITESPACE_RE.test(stored)
    ? stored.trim()
    : undefined;
  writeCache(guildID, resolved ?? MISSING);
  return resolved;
}

export function setGuildPrefixCache(guildID: string, value: string | undefined): void {
  writeCache(guildID, value ?? MISSING);
}

export function clearGuildPrefixCache(): void {
  cache.clear();
}
