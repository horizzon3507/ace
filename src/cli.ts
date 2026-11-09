import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SDK, Yuzuha, YuzuhaError, type YuzuhaConfig } from 'yuzuha';
import { colorEnabled, emit, explain, gatewayDetail, usage } from './cli-util.js';
import { applyChanges, watchProject } from './dev-reload.js';
import { watchDeploys } from './deploy-watch.js';
import { emoji } from './emoji.js';
import { fillMissingEnv } from './env-file.js';
import { prefix } from './live.js';
import { formatBanner, formatConnecting, type Panel } from './term.js';

function packageVersion(file: string): string {
  try {
    const parsed = JSON.parse(readFileSync(join(process.cwd(), file), 'utf8')) as { version?: string };
    return parsed.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

type Mode = 'dev' | 'start';

const closeGloss: Record<number, string> = {
  1000: 'fechamento normal',
  1001: 'servidor saindo',
  1006: 'conexão perdida',
  4004: 'token recusado',
};

async function readConfig(root: string): Promise<{ config: YuzuhaConfig; commandsPath: string }> {
  const file = ['yuzuha.config.ts', 'yuzuha.config.js', 'yuzuha.config.mjs'].find((name) => existsSync(join(root, name)));
  if (!file) throw new YuzuhaError('CONFIG_MISSING', 'arquivo de configuração não encontrado. Crie yuzuha.config.ts na raiz.');
  const imported = await import(pathToFileURL(join(root, file)).href) as { default?: unknown };
  const config = imported.default;
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new YuzuhaError('CONFIG_INVALID', 'o config precisa exportar um objeto default.');
  }
  const ace = config as YuzuhaConfig;
  if (ace.commands !== undefined && typeof ace.commands !== 'string') {
    throw new YuzuhaError('CONFIG_INVALID', 'o caminho de comandos precisa ser texto.');
  }
  if (ace.setup !== undefined && typeof ace.setup !== 'function') {
    throw new YuzuhaError('CONFIG_INVALID', 'setup precisa ser uma função.');
  }
  return { config: ace, commandsPath: resolve(root, ace.commands ?? 'commands') };
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
    version: packageVersion('package.json'),
    yuzuha: packageVersion('node_modules/yuzuha/package.json'),
    node: process.version,
    cwd,
  };
  return formatBanner(panel, colorEnabled());
}

async function main(): Promise<void> {
  process.on('unhandledRejection', (error: unknown) => emit('erro', explain(error)));
  // Trocada pelo fechamento de verdade quando o bot existir.
  let shutdown: () => Promise<void> = () => Promise.resolve();
  process.on('uncaughtException', (error: unknown) => {
    emit('erro', explain(error));
    void shutdown().finally(() => process.exit(1));
  });
  process.stdout.on('error', () => undefined);

  const args = process.argv.slice(2);
  const mode = args[0];
  if (args.length === 1 && (mode === '--help' || mode === '-h')) {
    console.log(usage());
    return;
  }
  if (args.length === 1 && (mode === '--version' || mode === '-v')) {
    console.log(`ace ${packageVersion('package.json')}`);
    return;
  }
  if (args.length !== 1 || (mode !== 'dev' && mode !== 'start')) {
    const flag = args.find((arg) => arg.startsWith('-'));
    if (flag) emit('erro', `flag desconhecida: ${flag}`);
    else if (args.length) emit('erro', `comando desconhecido: ${args.join(' ')}`);
    console.error(usage());
    process.exitCode = 1;
    return;
  }
  const root = process.cwd();
  const shellEnv = new Set(Object.keys(process.env));
  try {
    fillMissingEnv(await readFile(join(root, '.env'), 'utf8'), process.env);
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? error.code : undefined;
    if (code !== 'ENOENT') {
      emit('erro', `não deu para ler o .env: ${explain(error)}`);
      process.exitCode = 1;
      return;
    }
  }
  const { config, commandsPath } = await readConfig(root);
  let shown = false;
  let closing = false;
  const logger = SDK.createLogger({
    level: 'warn',
    sink(level, message, fields) {
      if (message === 'gateway error') return;
      const extra = fields
        ? `  ${Object.entries(fields).map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`).join(' ')}`
        : '';
      emit(level === 'error' ? 'erro' : 'sdk', `${message}${extra}`);
    },
  });
  let reported: unknown;
  let reportedDetail = '';
  const bot = new Yuzuha({
    ...config,
    emoji,
    clientOptions: { ...config.clientOptions, logger },
    onError(error, ctx) {
      if (closing) return config.onError?.(error, ctx);
      const gateway = gatewayDetail(error);
      const detail = gateway ?? `${ctx?.command?.name ? `${prefix()}${ctx.command.name}  ` : ''}${explain(error)}`;
      reported = error;
      reportedDetail = detail;
      emit(gateway ? 'gateway' : 'erro', detail);
      return config.onError?.(error, ctx);
    },
    onCommand(ctx, outcome) {
      if (outcome === 'success' || outcome === 'guarded') {
        const state = outcome === 'success' ? 'ok' : 'bloqueado';
        const who = ctx.authorName ? `  ${ctx.authorName}` : '';
        emit('comando', `${prefix()}${ctx.command.name}  ${state}${who}`);
      }
      return config.onCommand?.(ctx, outcome);
    },
  });
  const show = () => {
    if (shown || closing) return;
    const text = banner(bot, mode, root);
    console.log(text);
    shown = true;
  };
  const onDisconnect = (shardId: number, code: number) => {
    if (closing || code === 1000) return;
    const gloss = closeGloss[code];
    emit('gateway', `shard ${shardId} caiu (${code}${gloss ? `, ${gloss}` : ''}).`);
  };
  const onResume = (shardId: number) => {
    if (!closing) emit('gateway', `shard ${shardId} retomou.`);
  };
  bot.on(SDK.Events.Ready, show);
  bot.on(SDK.Events.ShardDisconnect, onDisconnect);
  bot.on(SDK.Events.ShardResumed, onResume);

  let watcher: { close(): Promise<void> } | undefined;
  let stop: Promise<void> | undefined;
  const onSignal = () => {
    void shutdown().catch((error: unknown) => {
      emit('erro', explain(error));
      process.exitCode = 1;
    });
  };
  shutdown = () => {
    stop ??= (async () => {
      closing = true;
      process.off('SIGINT', onSignal);
      process.off('SIGTERM', onSignal);
      emit('saindo', 'encerrando');
      await watcher?.close();
      try {
        await bot.destroy();
      } finally {
        await bot.options.store?.close?.();
      }
    })();
    return stop;
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  try {
    await config.setup?.(bot);
    if (stop) {
      await stop;
      return;
    }
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
    if (mode === 'dev') watcher = watchProject(root, commandsPath, (files) => applyChanges(root, bot, commandsPath, shellEnv, files));
    if (mode === 'start' && process.env.AUTO_UPDATE === '1') {
      watchDeploys(() => {
        emit('deploy', 'commit novo no main. Reiniciando pra puxar.');
        void shutdown().finally(() => process.exit(1));
      });
    }
  } catch (error) {
    if (stop) {
      await stop;
      return;
    }
    await bot.destroy().catch(() => undefined);
    const detail = explain(error);
    // O await bot.destroy() drena os reports do gateway — é o que faz a identidade bater.
    if (error === reported || detail === reportedDetail || gatewayDetail(error) === reportedDetail) {
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
