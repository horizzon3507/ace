import type { Store } from 'yuzuha';

const NAME = 'autorole';
const MISSING = '';

// Mesmo esquema do guild-prefix: store e cache ficam fora de RUNTIME_FILES pra
// sobreviver ao hot-reload.
let store: Store | undefined;
const cache = new Map<string, string>();

export function bindGuildAutoroles(next: Store): void {
  store = next;
}

const variableKey = (guildID: string): string => JSON.stringify(['guild', guildID, NAME]);

/**
 * Valor cru configurado: ID do cargo, 'off' ou undefined (nunca configurado).
 * 'off' é gravado em vez de deletar — apagar a chave reativaria o par fixo
 * do servidor original. Quem lê decide o fallback (joinRole).
 */
export async function guildAutorole(guildID: string | null | undefined): Promise<string | undefined> {
  if (!guildID) return undefined;
  const hit = cache.get(guildID);
  if (hit !== undefined) return hit === MISSING ? undefined : hit;
  if (!store) return undefined;
  const stored = store.readVariable
    ? await store.readVariable(variableKey(guildID), Date.now)
    : await store.read((state) => state.variables[variableKey(guildID)]);
  const resolved = typeof stored === 'string' && (stored === 'off' || /^\d+$/.test(stored))
    ? stored
    : undefined;
  cache.set(guildID, resolved ?? MISSING);
  return resolved;
}

export function setGuildAutoroleCache(guildID: string, value: string | undefined): void {
  cache.set(guildID, value ?? MISSING);
}
