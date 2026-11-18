import type { Store } from 'yuzuha';

const NAME = 'prefix';
const MISSING = '';
const MAX_CACHE = 2_000;
const WHITESPACE_RE = /\s/;

// O store e o cache ficam fora de RUNTIME_FILES: o import estático sobrevive ao
// hot-reload e a sessão não perde a conexão com o store nem o cache aquecido.
let store: Store | undefined;
let epoch = 0;
const cache = new Map<string, string>();
const inFlight = new Map<string, Promise<string | undefined>>();

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
  const active = store;
  if (!active) return undefined;
  const pending = inFlight.get(guildID);
  if (pending) return pending;

  const lookupEpoch = epoch;
  const task = (async () => {
    const stored = active.readVariable
      ? await active.readVariable(variableKey(guildID), Date.now)
      : await active.read((state) => state.variables[variableKey(guildID)]);
    const resolved = typeof stored === 'string' && stored.trim() && !WHITESPACE_RE.test(stored)
      ? stored.trim()
      : undefined;
    if (epoch === lookupEpoch) writeCache(guildID, resolved ?? MISSING);
    return resolved;
  })().finally(() => {
    if (inFlight.get(guildID) === task) inFlight.delete(guildID);
  });
  inFlight.set(guildID, task);
  return task;
}

export function setGuildPrefixCache(guildID: string, value: string | undefined): void {
  epoch += 1;
  writeCache(guildID, value ?? MISSING);
}

export function clearGuildPrefixCache(): void {
  epoch += 1;
  cache.clear();
}
