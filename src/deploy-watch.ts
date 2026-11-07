import { execSync } from 'node:child_process';

const INTERVAL_MS = (Number(process.env.DEPLOY_POLL_SECONDS) || 60) * 1000;

function git(args: string): string | undefined {
  try {
    return execSync(`git ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || undefined;
  } catch {
    return undefined;
  }
}

function remoteSlug(): string | undefined {
  const url = git('remote get-url origin');
  return url?.match(/github\.com[/:]([\w.-]+\/[\w.-]+?)(?:\.git)?$/)?.[1];
}

async function remoteSha(slug: string, branch: string, etag?: string): Promise<{ sha?: string; etag?: string }> {
  const res = await fetch(`https://api.github.com/repos/${slug}/commits/${branch}`, {
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
  const slug = remoteSlug();
  const branch = git('rev-parse --abbrev-ref HEAD');
  if (!slug || !branch || branch === 'HEAD') return;
  let etag: string | undefined;
  let baseline: string | undefined;
  const tick = async () => {
    try {
      baseline ??= git('rev-parse HEAD');
      const result = await remoteSha(slug, branch, etag);
      etag = result.etag;
      if (result.sha && baseline && result.sha !== baseline) onDeploy();
    } catch {
      // Rede caiu ou GitHub fora — tenta de novo no próximo tick.
    }
  };
  void tick();
  setInterval(tick, INTERVAL_MS);
}
