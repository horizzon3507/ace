import { parseEnv } from 'node:util';
import { DEFAULT_PREFIX } from './prefix.js';

export type EnvPlan = {
  assignments: { key: string; value: string }[];
  prefix: string | null;
  tokenChanged: boolean;
  tokenRemoved: boolean;
};

export function fillMissingEnv(text: string, env: NodeJS.ProcessEnv): void {
  if (!text) return;
  const parsed = parseEnv(text);
  for (const key in parsed) {
    if (!Object.hasOwn(parsed, key)) continue;
    const value = parsed[key];
    if (typeof value === 'string') env[key] ??= value;
  }
}

export function planEnv(text: string, env: Readonly<NodeJS.ProcessEnv>, preserve?: ReadonlySet<string>): EnvPlan {
  const parsed = text ? parseEnv(text) : {};
  const assignments: { key: string; value: string }[] = [];
  let prefix: string | null = null;
  const currentToken = env.FLUXER_BOT_TOKEN;
  const nextToken = parsed.FLUXER_BOT_TOKEN;
  const tokenChanged = typeof nextToken === 'string' && nextToken !== currentToken;
  const tokenRemoved = typeof currentToken === 'string' && nextToken === undefined;
  for (const key in parsed) {
    if (!Object.hasOwn(parsed, key)) continue;
    const value = parsed[key];
    if (key === 'FLUXER_BOT_TOKEN' || typeof value !== 'string') continue;
    if (preserve?.has(key) || env[key] === value) continue;
    assignments.push({ key, value });
    if (key === 'PREFIX') {
      const trimmed = value.trim();
      prefix = trimmed || DEFAULT_PREFIX;
    }
  }
  return { assignments, prefix, tokenChanged, tokenRemoved };
}

export function applyEnvPlan(plan: EnvPlan, env: NodeJS.ProcessEnv): void {
  for (const { key, value } of plan.assignments) env[key] = value;
}
