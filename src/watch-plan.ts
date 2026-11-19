export type ReloadKind = 'commands' | 'runtime' | 'env' | 'restart' | 'ignore';

export const RUNTIME_FILES = [
  'src/mention.ts',
  'src/prefix.ts',
  'src/brand.ts',
  'src/join-role.ts',
  'src/punish.ts',
  'src/resolve.ts',
  'src/emoji.ts',
  'src/channel-lock.ts',
  'src/format.ts',
  'src/embed.ts',
  'src/purge.ts',
  'src/info.ts',
  'src/emoji-dump.ts',
  'src/paginator.ts',
] as const;

// Só-de-tipo: nada existe em runtime pra recarregar — ignora em vez de pedir
// restart. Se um deles ganhar código executável, sai da lista.
export const TYPE_ONLY_FILES = [
  'src/context.ts',
] as const;

const RUNTIME_SET = new Set<string>(RUNTIME_FILES);
const TYPE_ONLY_SET = new Set<string>(TYPE_ONLY_FILES);
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'data', 'assets', 'coverage']);
const CODE_RE = /\.(?:[cm]?js|ts|mts)$/;
const TEST_RE = /\.(?:test|spec)\.[cm]?[jt]s$/;
const CONFIG_RE = /^yuzuha\.config\.(?:ts|mts|js|mjs|cjs)$/;

function normalize(input: string): string {
  if (
    input &&
    !input.includes('\\') &&
    !input.includes('//') &&
    !input.startsWith('/') &&
    !input.endsWith('/') &&
    !input.startsWith('./') &&
    !input.includes('/.')
  ) {
    return input;
  }
  const parts: string[] = [];
  for (const part of input.replaceAll('\\', '/').replace(/^\.\//, '').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

function isCode(path: string): boolean {
  return CODE_RE.test(path) && !path.endsWith('.d.ts');
}

export function classifyChange(input: string, commandsDir = 'commands'): ReloadKind {
  const path = normalize(input);
  if (!path) return 'ignore';
  const parts = path.split('/');
  for (let i = 0; i < parts.length; i += 1) {
    if (IGNORED_DIRS.has(parts[i]!)) return 'ignore';
  }
  if (path.endsWith('.map') || path.endsWith('~') || path.endsWith('.swp')) return 'ignore';
  if (path === '.env') return 'env';
  if (CONFIG_RE.test(path)) return 'restart';
  if (parts[0] === 'test' || TEST_RE.test(path)) return 'ignore';
  const commands = normalize(commandsDir);
  if (commands && (path === commands || path.startsWith(`${commands}/`)) && isCode(path)) return 'commands';
  if (parts[0] === 'src' && isCode(path)) {
    if (TYPE_ONLY_SET.has(path)) return 'ignore';
    return RUNTIME_SET.has(path) ? 'runtime' : 'restart';
  }
  return 'ignore';
}
