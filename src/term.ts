import { brand } from './brand.js';

export type PanelCommand = { name: string; description?: string; aliases?: string[] };

export type Panel = {
  mode: 'dev' | 'start';
  displayName: string;
  username: string;
  id: string;
  prefix: string;
  guilds: number;
  ping: number | null;
  commands: PanelCommand[];
  version: string;
  yuzuha: string;
  node: string;
  cwd: string;
};

function channel(hex: number): string {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return `${r};${g};${b}`;
}

function paint(enabled: boolean, open: string, text: string): string {
  if (!enabled) return text;
  return `\x1b[${open}m${text}\x1b[0m`;
}

function dim(enabled: boolean, text: string): string {
  return paint(enabled, '2', text);
}

function chip(enabled: boolean, text: string): string {
  if (!enabled) return `[${text}]`;
  return `\x1b[48;2;${channel(brand.primary)}m\x1b[38;2;${channel(brand.background)}m\x1b[1m ${text} \x1b[0m`;
}

function bold(enabled: boolean, text: string): string {
  return paint(enabled, '1', text);
}

function row(enabled: boolean, label: string, value: string): string {
  return `${dim(enabled, label.padEnd(14))}${value}`;
}

function commandBlock(panel: Panel, color: boolean): string[] {
  const commands = panel.commands.filter((command) => command.name).slice().sort((a, b) => a.name.localeCompare(b.name));
  if (commands.length === 0) return [dim(color, '  nenhum')];
  const width = Math.max(...commands.map((command) => (panel.prefix + command.name).length));
  const aliasIndent = ' '.repeat(width + 4);
  return commands.flatMap((command) => {
    const label = `${panel.prefix}${command.name}`.padEnd(width);
    const description = command.description ?? '';
    const head = `  ${label}  ${description}`.trimEnd();
    const aliases = command.aliases?.filter(Boolean) ?? [];
    if (aliases.length === 0) return [head];
    return [head, dim(color, `${aliasIndent}${aliases.join(', ')}`)];
  });
}

export function formatConnecting(mode: 'dev' | 'start', color: boolean): string {
  return `${chip(color, 'ACE')}  ${dim(color, mode.toUpperCase())}  conectando ao Fluxer`;
}

export function formatBanner(panel: Panel, color: boolean): string {
  const who = panel.displayName === panel.username ? panel.displayName : `${panel.displayName}  ${dim(color, `@${panel.username}`)}`;
  const count = panel.commands.filter((command) => command.name).length;
  const columns = process.stdout.columns;
  const cwd = columns !== undefined && columns > 0 && panel.cwd.length > columns ? `${panel.cwd.slice(0, columns - 1)}…` : panel.cwd;
  const watch = panel.mode === 'dev'
    ? 'comandos, menção, prefixo, marca, cargo, kick/ban e PREFIX'
    : 'desligado (npm run dev)';
  return [
    `${chip(color, 'ACE')}  ${dim(color, panel.mode.toUpperCase())}`,
    '',
    bold(color, 'Conta'),
    row(color, 'conta', who),
    row(color, 'id', panel.id || 'ainda sem id'),
    row(color, 'prefixo', panel.prefix),
    row(color, 'servidores', String(panel.guilds)),
    row(color, 'latência', panel.ping !== null && panel.ping > 0 ? `${Math.round(panel.ping)} ms` : 'sem amostra'),
    row(color, 'menção', `só no @${panel.username} direto`),
    '',
    bold(color, `Comandos (${count})`),
    ...commandBlock(panel, color),
    '',
    bold(color, 'Recarga'),
    row(color, 'ao vivo', watch),
    row(color, 'reinicia', 'yuzuha.config.ts, a cli e o token'),
    '',
    dim(color, `ace ${panel.version}   yuzuha ${panel.yuzuha}   node ${panel.node}`),
    dim(color, cwd),
  ].join('\n');
}

const LABEL_WIDTH = 10;
const LABEL_SGR: Record<string, string> = { erro: '31', gateway: '33', saindo: '33' };

export function formatLine(time: string, label: string, detail: string, color: boolean): string {
  const pad = ' '.repeat(time.length + 2 + LABEL_WIDTH);
  const body = detail.split('\n').map((line, index) => (index === 0 ? line : `${pad}${line}`)).join('\n');
  const tag = label.slice(0, LABEL_WIDTH).padEnd(LABEL_WIDTH);
  const sgr = LABEL_SGR[label];
  return `${dim(color, time)}  ${sgr ? paint(color, sgr, tag) : tag}${body}`;
}

export function useColor(stream: { isTTY?: boolean }, env: NodeJS.ProcessEnv): boolean {
  if (env.FORCE_COLOR !== undefined) return env.FORCE_COLOR !== '0' && env.FORCE_COLOR !== 'false';
  if (env.NO_COLOR !== undefined) return false;
  return Boolean(stream.isTTY);
}
