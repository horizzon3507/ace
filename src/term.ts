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

export function formatConnecting(mode: 'dev' | 'start', color: boolean): string {
  return `${chip(color, 'ACE')}  ${dim(color, mode.toUpperCase())}  connecting to Fluxer...`;
}

export function formatBanner(panel: Panel, color: boolean): string {
  const who = panel.displayName === panel.username ? panel.displayName : `${panel.displayName}  ${dim(color, `@${panel.username}`)}`;
  const commands = panel.commands.filter((command) => command.name);
  const width = Math.max(1, ...commands.map((command) => (panel.prefix + command.name).length));
  const commandLines = commands.length === 0
    ? [dim(color, '  none')]
    : commands.map((command) => {
      const label = `${panel.prefix}${command.name}`.padEnd(width);
      const alias = command.aliases?.length ? dim(color, `  (aliases: ${command.aliases.join(', ')})`) : '';
      const description = command.description ? `  ${command.description}` : '';
      return `  ${label}${description}${alias}`;
    });
  const watch = panel.mode === 'dev'
    ? 'commands, mention, prefix, brand, join role & .env PREFIX'
    : 'disabled (run npm run dev to enable live reload)';
  return [
    `${chip(color, 'ACE')}  ${dim(color, panel.mode.toUpperCase())}`,
    '',
    bold(color, 'Bot Information'),
    row(color, 'account', who),
    row(color, 'id', panel.id || 'no id yet'),
    row(color, 'prefix', panel.prefix),
    row(color, 'guilds', String(panel.guilds)),
    row(color, 'latency', panel.ping !== null && panel.ping > 0 ? `${panel.ping} ms` : 'no sample yet'),
    row(color, 'mention', 'triggers only on direct @Ace mention'),
    '',
    bold(color, 'Registered Commands'),
    ...commandLines,
    '',
    bold(color, 'Environment & Reload'),
    row(color, 'live reload', watch),
    row(color, 'restart on', 'yuzuha.config.ts, cli & bot token'),
    dim(color, `yuzuha ${panel.yuzuha}   node ${panel.node}`),
    dim(color, panel.cwd),
  ].join('\n');
}

export function formatLine(time: string, label: string, detail: string, color: boolean): string {
  const pad = ' '.repeat(time.length + 2 + 10);
  const body = detail.split('\n').map((line, index) => (index === 0 ? line : `${pad}${line}`)).join('\n');
  return `${dim(color, time)}  ${label.padEnd(10)}${body}`;
}

export function useColor(stream: { isTTY?: boolean }, env: NodeJS.ProcessEnv): boolean {
  return Boolean(stream.isTTY) && env.NO_COLOR === undefined;
}
