export type ReloadKind = 'commands' | 'runtime' | 'env' | 'restart' | 'ignore';

export const RUNTIME_FILES = [
  'src/mention.ts',
  'src/prefix.ts',
  'src/brand.ts',
  'src/join-role.ts',
  'src/punish.ts',
  'src/resolve.ts',
  'src/emoji.ts',
] as const;

function normalize(input: string): string {
  const parts: string[] = [];
  for (const part of input.replaceAll('\\', '/').replace(/^\.\//, '').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

function isCode(path: string): boolean {
  return /\.(?:[cm]?js|ts|mts)$/.test(path) && !path.endsWith('.d.ts');
}

export function classifyChange(input: string, commandsDir = 'commands'): ReloadKind {
  const path = normalize(input);
  if (!path) return 'ignore';
  const parts = path.split('/');
  if (parts.some((part) => part === 'node_modules' || part === '.git' || part === 'dist' || part === 'data' || part === 'assets' || part === 'coverage')) {
    return 'ignore';
  }
  if (path.endsWith('.map') || path.endsWith('~') || path.endsWith('.swp')) return 'ignore';
  if (path === '.env') return 'env';
  if (/^yuzuha\.config\.(?:ts|mts|js|mjs|cjs)$/.test(path)) return 'restart';
  if (parts[0] === 'test' || /\.(?:test|spec)\.[cm]?[jt]s$/.test(path)) return 'ignore';
  const commands = normalize(commandsDir);
  if (commands && (path === commands || path.startsWith(`${commands}/`)) && isCode(path)) return 'commands';
  if (parts[0] === 'src' && isCode(path)) return (RUNTIME_FILES as readonly string[]).includes(path) ? 'runtime' : 'restart';
  return 'ignore';
}
