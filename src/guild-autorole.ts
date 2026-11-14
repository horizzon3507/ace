import type { Store } from 'yuzuha';

const NAME = 'autorole';

export type AutoroleCategory = 'all' | 'user' | 'app';
/** string[] = cargos da categoria; 'off' = desligado explícito; ausente = nunca configurado. */
export type AutoroleConfig = Partial<Record<AutoroleCategory, string[] | 'off'>>;

// Mesmo esquema do guild-prefix: store e cache ficam fora de RUNTIME_FILES pra
// sobreviver ao hot-reload.
let store: Store | undefined;
const cache = new Map<string, AutoroleConfig | null>();

export function bindGuildAutoroles(next: Store): void {
  store = next;
}

const variableKey = (guildID: string): string => JSON.stringify(['guild', guildID, NAME]);

const isIds = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string' && /^\d+$/.test(item));

// Lê formatos antigos também: 'off' e o ID solto da época de um cargo só.
function normalize(raw: unknown): AutoroleConfig | undefined {
  if (typeof raw === 'string') {
    if (raw === 'off') return { all: 'off' };
    return /^\d+$/.test(raw) ? { all: [raw] } : undefined;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const config: AutoroleConfig = {};
  for (const key of ['all', 'user', 'app'] as const) {
    const value = (raw as Record<string, unknown>)[key];
    if (value === 'off' || isIds(value)) config[key] = value;
  }
  return Object.keys(config).length ? config : undefined;
}

/**
 * Config crua do servidor; 'off' por categoria é gravado em vez de deletar —
 * apagar a chave reativaria o par fixo do servidor original. Quem lê decide
 * o fallback (joinRole).
 */
export async function guildAutorole(guildID: string | null | undefined): Promise<AutoroleConfig | undefined> {
  if (!guildID) return undefined;
  if (cache.has(guildID)) return cache.get(guildID) ?? undefined;
  if (!store) return undefined;
  const stored = store.readVariable
    ? await store.readVariable(variableKey(guildID), Date.now)
    : await store.read((state) => state.variables[variableKey(guildID)]);
  const resolved = normalize(stored);
  cache.set(guildID, resolved ?? null);
  return resolved;
}

export function setGuildAutoroleCache(guildID: string, config: AutoroleConfig | undefined): void {
  cache.set(guildID, config ?? null);
}
