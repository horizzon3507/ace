import type { Store } from 'yuzuha';

const NAME = 'autorole';
const MAX_CACHE = 2_000;
const ID_RE = /^\d+$/;
const CATEGORIES = ['all', 'user', 'app'] as const;

export type AutoroleCategory = 'all' | 'user' | 'app';
/** string[] = cargos da categoria; 'off' = desligado explícito; ausente = nunca configurado. */
export type AutoroleConfig = Partial<Record<AutoroleCategory, string[] | 'off'>>;

// Mesmo esquema do guild-prefix: store e cache ficam fora de RUNTIME_FILES pra
// sobreviver ao hot-reload.
let store: Store | undefined;
const cache = new Map<string, AutoroleConfig | null>();

function writeCache(guildID: string, config: AutoroleConfig | null): void {
  if (cache.has(guildID)) {
    cache.delete(guildID);
  } else if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(guildID, config);
}

export function bindGuildAutoroles(next: Store): void {
  store = next;
}

const variableKey = (guildID: string): string => JSON.stringify(['guild', guildID, NAME]);

const isIds = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string' && ID_RE.test(item));

// Lê formatos antigos também: 'off' e o ID solto da época de um cargo só.
function normalize(raw: unknown): AutoroleConfig | undefined {
  if (typeof raw === 'string') {
    if (raw === 'off') return { all: 'off' };
    return ID_RE.test(raw) ? { all: [raw] } : undefined;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const config: AutoroleConfig = {};
  for (let i = 0; i < CATEGORIES.length; i += 1) {
    const key = CATEGORIES[i]!;
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
  if (cache.has(guildID)) {
    const hit = cache.get(guildID)!;
    cache.delete(guildID);
    cache.set(guildID, hit);
    return hit ?? undefined;
  }
  if (!store) return undefined;
  const stored = store.readVariable
    ? await store.readVariable(variableKey(guildID), Date.now)
    : await store.read((state) => state.variables[variableKey(guildID)]);
  const resolved = normalize(stored);
  writeCache(guildID, resolved ?? null);
  return resolved;
}

export function setGuildAutoroleCache(guildID: string, config: AutoroleConfig | undefined): void {
  writeCache(guildID, config ?? null);
}
