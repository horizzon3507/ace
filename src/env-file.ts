import { parseEnv } from 'node:util';

export type EnvPlan = {
  assignments: { key: string; value: string }[];
  prefix: string | null;
  tokenChanged: boolean;
  tokenRemoved: boolean;
};

export function fillMissingEnv(text: string, env: NodeJS.ProcessEnv): void {
  for (const [key, value] of Object.entries(parseEnv(text))) {
    if (typeof value === 'string') env[key] ??= value;
  }
}

export function planEnv(text: string, env: Readonly<NodeJS.ProcessEnv>, preserve?: ReadonlySet<string>): EnvPlan {
  const parsed = parseEnv(text);
  const assignments: { key: string; value: string }[] = [];
  let prefix: string | null = null;
  const currentToken = env.FLUXER_BOT_TOKEN;
  const nextToken = parsed.FLUXER_BOT_TOKEN;
  const tokenChanged = typeof nextToken === 'string' && nextToken !== currentToken;
  const tokenRemoved = typeof currentToken === 'string' && nextToken === undefined;
  for (const [key, value] of Object.entries(parsed)) {
    if (key === 'FLUXER_BOT_TOKEN' || typeof value !== 'string') continue;
    if (preserve?.has(key) || env[key] === value) continue;
    assignments.push({ key, value });
    if (key === 'PREFIX') prefix = value.trim() ? value.trim() : 'a.';
  }
  return { assignments, prefix, tokenChanged, tokenRemoved };
}

export function applyEnvPlan(plan: EnvPlan, env: NodeJS.ProcessEnv): void {
  for (const { key, value } of plan.assignments) env[key] = value;
}
