import { execSync } from 'node:child_process';

const REPO = 'horizzon3507/ace';
const BRANCH = 'main';
const INTERVAL_MS = 5 * 60 * 1000;

function localSha(): string | undefined {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || undefined;
  } catch {
    return undefined;
  }
}

async function remoteSha(etag?: string): Promise<{ sha?: string; etag?: string }> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/commits/${BRANCH}`, {
    headers: {
      'User-Agent': 'ace-deploy-watch',
      Accept: 'application/vnd.github+json',
      ...(etag ? { 'If-None-Match': etag } : {}),
    },
  });
  const nextEtag = res.headers.get('etag') ?? etag;
  if (res.status === 304 || !res.ok) return { etag: nextEtag };
  const body = await res.json() as { sha?: string };
  return { sha: body.sha, etag: nextEtag };
}

export function watchDeploys(onDeploy: () => void): void {
  let etag: string | undefined;
  let baseline: string | undefined;
  const tick = async () => {
    try {
      baseline ??= localSha();
      const result = await remoteSha(etag);
      etag = result.etag;
      if (result.sha && baseline && result.sha !== baseline) onDeploy();
    } catch {
      // Rede caiu ou GitHub fora — tenta de novo no próximo tick.
    }
  };
  void tick();
  setInterval(tick, INTERVAL_MS);
}
