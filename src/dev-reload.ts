import { watch, type FSWatcher } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Yuzuha } from 'yuzuha';
import { emit, explain } from './cli-util.js';
import { emoji } from './emoji.js';
import { applyEnvPlan, planEnv } from './env-file.js';
import { installRuntime } from './live.js';
import { classifyChange, RUNTIME_FILES, type ReloadKind } from './watch-plan.js';

export async function refreshRuntime(root: string): Promise<void> {
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const load = (file: string) => import(`${pathToFileURL(resolve(root, file)).href}?ace=${stamp}`);
  const [mention, prefixMod, brandMod, joinMod, punishMod, resolveMod, emojiMod, lockMod, formatMod, embedMod, purgeMod, infoMod] = await Promise.all(RUNTIME_FILES.map(load)) as [
    typeof import('./mention.js'),
    typeof import('./prefix.js'),
    typeof import('./brand.js'),
    typeof import('./join-role.js'),
    typeof import('./punish.js'),
    typeof import('./resolve.js'),
    typeof import('./emoji.js'),
    typeof import('./channel-lock.js'),
    typeof import('./format.js'),
    typeof import('./embed.js'),
    typeof import('./purge.js'),
    typeof import('./info.js'),
  ];
  const missing = (file: string, name: string) => new Error(`${file} não exportou '${name}'.`);
  if (typeof mention.mentionMessage !== 'function') throw missing('src/mention.ts', 'mentionMessage');
  if (typeof mention.isBareMention !== 'function') throw missing('src/mention.ts', 'isBareMention');
  if (typeof mention.unknownCommandMessage !== 'function') throw missing('src/mention.ts', 'unknownCommandMessage');
  if (typeof prefixMod.prefix !== 'function') throw missing('src/prefix.ts', 'prefix');
  if (!brandMod.brand) throw missing('src/brand.ts', 'brand');
  if (typeof joinMod.grantJoinRole !== 'function') throw missing('src/join-role.ts', 'grantJoinRole');
  if (typeof resolveMod.resolveTarget !== 'function') throw missing('src/resolve.ts', 'resolveTarget');
  if (typeof resolveMod.moderationReason !== 'function') throw missing('src/resolve.ts', 'moderationReason');
  if (typeof resolveMod.targetUserID !== 'function') throw missing('src/resolve.ts', 'targetUserID');
  if (typeof resolveMod.resolveBanTarget !== 'function') throw missing('src/resolve.ts', 'resolveBanTarget');
  if (typeof resolveMod.resolveAssetTarget !== 'function') throw missing('src/resolve.ts', 'resolveAssetTarget');
  if (typeof punishMod.bindModeration !== 'function') throw missing('src/punish.ts', 'bindModeration');
  if (!emojiMod.emoji || typeof emojiMod.emoji !== 'object') throw missing('src/emoji.ts', 'emoji');
  for (const [key, value] of Object.entries(emojiMod.emoji)) {
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(`src/emoji.ts: 'emoji.${key}' não é texto.`);
    }
  }
  const runModeration = punishMod.bindModeration({ resolveTarget: resolveMod.resolveTarget, resolveBanTarget: resolveMod.resolveBanTarget, moderationReason: resolveMod.moderationReason });
  if (typeof runModeration !== 'function') {
    throw new Error('src/punish.ts: bindModeration() não devolveu função.');
  }
  if (typeof lockMod.runChannelLock !== 'function') throw missing('src/channel-lock.ts', 'runChannelLock');
  if (typeof formatMod.formatStamp !== 'function') throw missing('src/format.ts', 'formatStamp');
  if (typeof formatMod.formatDayStamp !== 'function') throw missing('src/format.ts', 'formatDayStamp');
  if (typeof formatMod.formatAge !== 'function') throw missing('src/format.ts', 'formatAge');
  if (typeof embedMod.replyUserAsset !== 'function') throw missing('src/embed.ts', 'replyUserAsset');
  if (typeof embedMod.replyGuildAsset !== 'function') throw missing('src/embed.ts', 'replyGuildAsset');
  if (typeof purgeMod.runPurge !== 'function') throw missing('src/purge.ts', 'runPurge');
  if (typeof infoMod.replyUserInfo !== 'function') throw missing('src/info.ts', 'replyUserInfo');
  if (typeof infoMod.replyGuildInfo !== 'function') throw missing('src/info.ts', 'replyGuildInfo');
  installRuntime({
    prefix: prefixMod.prefix,
    mentionMessage: mention.mentionMessage,
    isBareMention: mention.isBareMention,
    unknownCommandMessage: mention.unknownCommandMessage,
    grantJoinRole: joinMod.grantJoinRole,
    runModeration,
    runChannelLock: lockMod.runChannelLock,
    targetUserID: resolveMod.targetUserID,
    resolveTarget: resolveMod.resolveTarget,
    resolveBanTarget: resolveMod.resolveBanTarget,
    resolveAssetTarget: resolveMod.resolveAssetTarget,
    moderationReason: resolveMod.moderationReason,
    formatStamp: formatMod.formatStamp,
    formatDayStamp: formatMod.formatDayStamp,
    formatAge: formatMod.formatAge,
    replyUserInfo: infoMod.replyUserInfo,
    replyGuildInfo: infoMod.replyGuildInfo,
    replyUserAsset: embedMod.replyUserAsset,
    replyGuildAsset: embedMod.replyGuildAsset,
    runPurge: purgeMod.runPurge,
    brand: brandMod.brand,
  });
  // Quem importa emoji segura a referência do módulo original: muta in-place só
  // depois do install, para uma falha acima não deixar os emojis meio-trocados.
  Object.assign(emoji, emojiMod.emoji);
}

export function relativeChange(root: string, filename: string): string | undefined {
  const absolute = isAbsolute(filename) ? filename : join(root, filename);
  const rel = relative(root, absolute);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return undefined;
  return rel;
}

export function watchProject(root: string, commandsPath: string, onFiles: (files: string[]) => Promise<void>): { close(): Promise<void> } {
  const commandsDir = relative(root, commandsPath);
  let closed = false;
  let timer: NodeJS.Timeout | undefined;
  let chain = Promise.resolve();
  const pending = new Set<string>();
  let watcher: FSWatcher;
  try {
    watcher = watch(root, { recursive: true }, (_event, filename) => {
      if (closed || !filename) return;
      const file = relativeChange(root, filename.toString());
      if (!file || classifyChange(file, commandsDir) === 'ignore') return;
      pending.add(file);
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
    emit('erro', `não deu para observar a pasta. Reinicie para aplicar. ${explain(error)}`);
    return { async close() { closed = true; } };
  }
  watcher.on('error', (error) => {
    if (!closed) emit('erro', `observador caiu — a recarga parou. Reinicie para aplicar. ${explain(error)}`);
  });
  return {
    async close() {
      closed = true;
      clearTimeout(timer);
      watcher.close();
      await Promise.race([chain, new Promise<void>((done) => setTimeout(done, 3_000).unref())]);
    },
  };
}

export async function applyChanges(root: string, bot: Yuzuha, commandsPath: string, shellEnv: ReadonlySet<string>, filenames: string[]): Promise<void> {
  const files = [...new Set(filenames.map((name) => relativeChange(root, name)).filter((name): name is string => Boolean(name)))];
  const commandsDir = relative(root, commandsPath);
  const kinds = new Map<ReloadKind, string[]>();
  for (const file of files) {
    const kind = classifyChange(file, commandsDir);
    const list = kinds.get(kind) ?? [];
    list.push(file);
    kinds.set(kind, list);
  }
  const envFiles = kinds.get('env') ?? [];
  if (envFiles.length) {
    try {
      const plan = planEnv(await readFile(join(root, '.env'), 'utf8'), process.env, shellEnv);
      applyEnvPlan(plan, process.env);
      if (plan.prefix) emit('prefixo', plan.prefix);
      const keys = plan.assignments.filter((item) => item.key !== 'PREFIX').map((item) => item.key);
      if (keys.length) emit('env', keys.join(', '));
      if (plan.tokenChanged) emit('token', 'FLUXER_BOT_TOKEN mudou no .env. Este processo segue com o token anterior. Reinicie para aplicar.');
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? error.code : undefined;
      if (code === 'ENOENT') emit('env', 'o .env sumiu — nada mudou.');
      else emit('erro', explain(error));
    }
  }
  const runtimeFiles = kinds.get('runtime') ?? [];
  if (runtimeFiles.length) {
    try {
      await refreshRuntime(root);
      emit('runtime', runtimeFiles.join(', '));
    } catch (error) {
      emit('erro', `${runtimeFiles.join(', ')}\n${explain(error)}`);
    }
  }
  if (kinds.has('commands')) {
    try {
      await bot.reload(commandsPath);
      const names = bot.listCommands().filter((command) => !command.hidden).map((command) => command.name).sort();
      emit('comandos', names.length ? names.join(', ') : 'nenhum');
    } catch (error) {
      emit('erro', explain(error));
    }
  }
  const restart = kinds.get('restart') ?? [];
  if (restart.length) emit('config', `reinicie o dev para aplicar: ${restart.join(', ')}`);
}
