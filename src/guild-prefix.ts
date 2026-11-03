import type { Store } from 'yuzuha';

const NAME = 'prefix';
const MISSING = '';

// O store e o cache ficam fora de RUNTIME_FILES: o import estático sobrevive ao
// hot-reload e a sessão não perde a conexão com o store nem o cache aquecido.
let store: Store | undefined;
const cache = new Map<string, string>();

export function bindGuildPrefixes(next: Store): void {
  store = next;
}

// Mesma chave do variableKey do yuzuha: [escopo, sujeito, nome] em JSON.
const variableKey = (guildID: string): string => JSON.stringify(['guild', guildID, NAME]);

export async function guildPrefix(guildID: string | null | undefined): Promise<string | undefined> {
  if (!guildID) return undefined;
  const hit = cache.get(guildID);
  if (hit !== undefined) return hit === MISSING ? undefined : hit;
  if (!store) return undefined;
  const stored = store.readVariable
    ? await store.readVariable(variableKey(guildID), Date.now)
    : await store.read((state) => state.variables[variableKey(guildID)]);
  const resolved = typeof stored === 'string' && stored.trim() && !/\s/.test(stored)
    ? stored.trim()
    : undefined;
  cache.set(guildID, resolved ?? MISSING);
  return resolved;
}

export function setGuildPrefixCache(guildID: string, value: string | undefined): void {
  cache.set(guildID, value ?? MISSING);
}
