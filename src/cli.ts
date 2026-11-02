import { existsSync, readFileSync, watch, type FSWatcher } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createLogger } from '@fluxerjs/util';
import { ScriptError, SDK, Yuzuha, YuzuhaError } from 'yuzuha';
import { applyEnvPlan, fillMissingEnv, planEnv } from './env-file.js';
import { installRuntime, prefix } from './live.js';
import { formatBanner, formatConnecting, formatLine, useColor, type Panel } from './term.js';
import { classifyChange, type ReloadKind } from './watch-plan.js';

function yuzuhaPackageVersion(): string {
  try {
    const parsed = JSON.parse(readFileSync(join(process.cwd(), 'node_modules/yuzuha/package.json'), 'utf8')) as { version?: string };
    return parsed.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

type Mode = 'dev' | 'start';

type AceConfig = {
  name?: string;
  commands?: string;
  setup?: (bot: Yuzuha) => void | Promise<void>;
  clientOptions?: object;
  onError?: (error: unknown, ctx?: { command?: { name?: string } }) => void | Promise<void>;
  onCommand?: (ctx: { command: { name: string }; authorName: string }, outcome: string) => void | Promise<void>;
};

const closeGloss: Record<number, string> = {
  1000: 'normal closure',
  1001: 'server going away',
  1006: 'connection lost',
  4004: 'token rejected',
};

function clock(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function colorEnabled(): boolean {
  return useColor(process.stdout, process.env);
}

function redact(text: string): string {
  const token = process.env.FLUXER_BOT_TOKEN;
  if (!token || token.length < 8 || !text.includes(token)) return text;
  return text.split(token).join('[token]');
}

function explain(error: unknown): string {
  const raw = error instanceof ScriptError
    ? error.format()
    : error instanceof YuzuhaError
      ? `${error.code}  ${error.message}`
      : error instanceof Error
        ? error.message || error.name
        : String(error);
  if (/invalid or expired authorization token/i.test(raw)) return 'token rejected. Check FLUXER_BOT_TOKEN.';
  return raw;
}

function emit(label: string, detail: string): void {
  console.log(formatLine(clock(), label, redact(detail), colorEnabled()));
}

function gatewayDetail(error: unknown): string | null {
  const message = error instanceof Error ? error.message : '';
  if (/authentication failed|\b4004\b/i.test(message)) return 'token rejected (4004). Check FLUXER_BOT_TOKEN and restart.';
  if (message === 'WebSocket error') return 'connection lost. Fluxer will retry automatically.';
  return null;
}

function usage(): string {
  return [
    'Usage:',
    '  npm run dev     start with live reload for commands, mention, prefix, brand & .env',
    '  npm start       start in production mode (no reload)',
  ].join('\n');
}

async function readConfig(root: string): Promise<{ config: AceConfig; commandsPath: string }> {
  const file = ['yuzuha.config.ts', 'yuzuha.config.js', 'yuzuha.config.mjs'].find((name) => existsSync(join(root, name)));
  if (!file) throw new YuzuhaError('CONFIG_MISSING', 'Configuration file not found. Ensure yuzuha.config.ts exists in bot root.');
  const imported = await import(pathToFileURL(join(root, file)).href) as { default?: unknown };
  const config = imported.default;
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new YuzuhaError('CONFIG_INVALID', 'Config must export a default object.');
  }
  const ace = config as AceConfig;
  if (ace.commands !== undefined && typeof ace.commands !== 'string') {
    throw new YuzuhaError('CONFIG_INVALID', 'commands path must be a string.');
  }
  if (ace.setup !== undefined && typeof ace.setup !== 'function') {
    throw new YuzuhaError('CONFIG_INVALID', 'setup must be a function.');
  }
  return { config: ace, commandsPath: resolve(root, ace.commands ?? 'commands') };
}

async function refreshRuntime(root: string): Promise<void> {
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const load = (file: string) => import(`${pathToFileURL(resolve(root, file)).href}?ace=${stamp}`);
  const [mention, prefixMod, brandMod, joinMod] = await Promise.all([
    load('src/mention.ts'),
    load('src/prefix.ts'),
    load('src/brand.ts'),
    load('src/join-role.ts'),
  ]) as [
    { mentionMessage?: unknown; isBareMention?: unknown; unknownCommandMessage?: unknown },
    { prefix?: unknown },
    { brand?: { primary: number; eyes: number; background: number } },
    { grantJoinRole?: unknown },
  ];
  if (typeof prefixMod.prefix !== 'function' || typeof mention.mentionMessage !== 'function' || typeof mention.isBareMention !== 'function' || typeof mention.unknownCommandMessage !== 'function' || typeof joinMod.grantJoinRole !== 'function' || !brandMod.brand) {
    throw new Error('src/mention.ts, src/prefix.ts, src/brand.ts or src/join-role.ts did not export expected members.');
  }
  installRuntime({
    prefix: prefixMod.prefix as () => string,
    mentionMessage: mention.mentionMessage as (commandPrefix: string) => string,
    isBareMention: mention.isBareMention as (content: string, selfId: string, mentioned: boolean) => boolean,
    unknownCommandMessage: mention.unknownCommandMessage as (content: string, commandPrefix: string, names: readonly string[]) => string | undefined,
    grantJoinRole: joinMod.grantJoinRole as (member: { guild: { id: string }; user: { bot: boolean }; roles: { has(roleId: string): boolean; add(roleId: string): Promise<void> } }) => Promise<boolean>,
    brand: brandMod.brand,
  });
}

function relativeChange(root: string, filename: string): string | undefined {
  const absolute = isAbsolute(filename) ? filename : join(root, filename);
  const rel = relative(root, absolute);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return undefined;
  return rel;
}

function watchProject(root: string, onFiles: (files: string[]) => Promise<void>): { close(): Promise<void> } {
  let closed = false;
  let timer: NodeJS.Timeout | undefined;
  let chain = Promise.resolve();
  const pending = new Set<string>();
  let watcher: FSWatcher;
  try {
    watcher = watch(root, { recursive: true }, (_event, filename) => {
      if (closed || !filename) return;
      pending.add(filename.toString());
      clearTimeout(timer);
      timer = setTimeout(() => {
        const batch = [...pending];
        pending.clear();
        chain = chain.then(async () => {
          if (!closed) await onFiles(batch);
        }).catch((error: unknown) => {
          emit('erro', explain(error));
        });
      }, 150);
    });
  } catch (error) {
    emit('error', `unable to watch directory. restart to apply changes. ${explain(error)}`);
    return { async close() { closed = true; } };
  }
  watcher.on('error', (error) => emit('error', explain(error)));
  return {
    async close() {
      closed = true;
      clearTimeout(timer);
      watcher.close();
      await chain;
    },
  };
}

function banner(bot: Yuzuha, mode: Mode, cwd: string): string {
  const user = bot.client.user;
  const display = user?.globalName || user?.username || 'Ace';
  const username = user?.username ?? 'ace';
  const discriminator = user?.discriminator && user.discriminator !== '0' ? `#${user.discriminator}` : '';
  const ping = bot.transport.ping;
  const panel: Panel = {
    mode,
    displayName: `${display}${discriminator}`,
    username,
    id: user?.id ?? '',
    prefix: prefix(),
    guilds: bot.client.guilds.size,
    ping: Number.isFinite(ping) ? ping : null,
    commands: bot.listCommands().filter((command) => !command.hidden).map((command) => ({
      name: command.name,
      description: command.description,
      aliases: command.aliases,
    })),
    yuzuha: yuzuhaPackageVersion(),
    node: process.version,
    cwd,
  };
  return formatBanner(panel, colorEnabled());
}

async function applyChanges(root: string, bot: Yuzuha, commandsPath: string, filenames: string[]): Promise<void> {
  const files = [...new Set(filenames.map((name) => relativeChange(root, name)).filter((name): name is string => Boolean(name)))];
  const kinds = new Map<ReloadKind, string[]>();
  for (const file of files) {
    const kind = classifyChange(file);
    const list = kinds.get(kind) ?? [];
    list.push(file);
    kinds.set(kind, list);
  }
  const envFiles = kinds.get('env') ?? [];
  if (envFiles.length) {
    try {
      const plan = planEnv(await readFile(join(root, '.env'), 'utf8'), process.env);
      applyEnvPlan(plan, process.env);
      if (plan.prefix) emit('prefix', plan.prefix);
      const keys = plan.assignments.filter((item) => item.key !== 'PREFIX').map((item) => item.key);
      if (keys.length) emit('env', keys.join(', '));
      if (plan.tokenChanged) emit('token', 'FLUXER_BOT_TOKEN changed in .env. Current process retains previous token. Restart to apply.');
    } catch (error) {
      emit('error', explain(error));
    }
  }
  const runtimeFiles = kinds.get('runtime') ?? [];
  if (runtimeFiles.length) {
    try {
      await refreshRuntime(root);
      emit('runtime', runtimeFiles.join(', '));
    } catch (error) {
      emit('error', `${runtimeFiles.join(', ')}\n${explain(error)}`);
    }
  }
  if (kinds.has('commands')) {
    try {
      await bot.reload(commandsPath);
      const names = bot.listCommands().filter((command) => !command.hidden).map((command) => command.name);
      emit('commands', names.length ? names.join(', ') : 'none');
    } catch (error) {
      emit('error', explain(error));
    }
  }
  const restart = kinds.get('restart') ?? [];
  if (restart.length) emit('config', `restart dev process to apply changes in: ${restart.join(', ')}`);
}

async function main(): Promise<void> {
  const mode = process.argv[2];
  if (mode !== 'dev' && mode !== 'start') {
    console.log(usage());
    process.exitCode = 1;
    return;
  }
  const root = process.cwd();
  try {
    fillMissingEnv(await readFile(join(root, '.env'), 'utf8'), process.env);
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? error.code : undefined;
    if (code !== 'ENOENT') throw error;
  }
  const { config, commandsPath } = await readConfig(root);
  let shown = false;
  let closing = false;
  const logger = createLogger({
    level: 'warn',
    sink(level, message, fields) {
      if (message === 'gateway error') return;
      const extra = fields
        ? `  ${Object.entries(fields).map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`).join(' ')}`
        : '';
      emit(level === 'error' ? 'error' : 'sdk', `${message}${extra}`);
    },
  });
  let reportedDetail = '';
  const bot = new Yuzuha({
    ...(config as object),
    clientOptions: { ...config.clientOptions, logger },
    onError(error, ctx) {
      const gateway = gatewayDetail(error);
      const detail = gateway ?? `${ctx?.command?.name ? `${prefix()}${ctx.command.name}  ` : ''}${explain(error)}`;
      reportedDetail = detail;
      emit(gateway ? 'gateway' : 'error', detail);
      return config.onError?.(error, ctx);
    },
    onCommand(ctx, outcome) {
      if (outcome === 'success' || outcome === 'guarded') {
        const state = outcome === 'success' ? 'ok' : 'blocked';
        const who = ctx.authorName ? `  ${ctx.authorName}` : '';
        emit('command', `${prefix()}${ctx.command.name}  ${state}${who}`);
      }
      return config.onCommand?.(ctx, outcome);
    },
  });
  const show = () => {
    if (shown || closing) return;
    shown = true;
    console.log(banner(bot, mode, root));
  };
  const onDisconnect = (shardId: number, code: number) => {
    if (closing || code === 1000) return;
    const gloss = closeGloss[code];
    emit('gateway', `shard ${shardId} disconnected (${code}${gloss ? `, ${gloss}` : ''}).`);
  };
  const onResume = (shardId: number) => {
    if (!closing) emit('gateway', `shard ${shardId} resumed.`);
  };
  bot.client.on(SDK.Events.Ready, show);
  bot.client.on(SDK.Events.ShardDisconnect, onDisconnect);
  bot.client.on(SDK.Events.ShardResumed, onResume);

  let watcher: { close(): Promise<void> } | undefined;
  let stop: Promise<void> | undefined;
  const shutdown = () => {
    stop ??= (async () => {
      closing = true;
      process.off('SIGINT', onSignal);
      process.off('SIGTERM', onSignal);
      emit('shutdown', 'shutting down');
      await watcher?.close();
      try {
        await bot.destroy();
      } finally {
        await bot.options.store?.close?.();
      }
    })();
    return stop;
  };
  const onSignal = () => { void shutdown().catch(() => { process.exitCode = 1; }); };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  try {
    await config.setup?.(bot);
    await bot.load(commandsPath, false);
    if (stop) {
      await stop;
      return;
    }
    console.log(formatConnecting(mode, colorEnabled()));
    await bot.login();
    if (stop) {
      await stop;
      return;
    }
    show();
    if (mode === 'dev') watcher = watchProject(root, (files) => applyChanges(root, bot, commandsPath, files));
  } catch (error) {
    if (stop) {
      await stop;
      return;
    }
    await bot.destroy().catch(() => undefined);
    const detail = explain(error);
    if (detail === reportedDetail || gatewayDetail(error) === reportedDetail) {
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

main().catch((error: unknown) => {
  emit('erro', explain(error));
  process.exitCode = 1;
});
