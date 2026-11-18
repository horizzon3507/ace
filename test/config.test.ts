import test from 'node:test';
import assert from 'node:assert/strict';
import { Yuzuha } from 'yuzuha';
import config from '../yuzuha.config.js';

test('yuzuha.config.ts instancia Yuzuha 0.7.0 com caches, owners e concorrencia validos', async (t) => {
  assert.deepEqual(config.owners, ['1473035660161241245']);
  assert.deepEqual(config.memberCache, { ttlMs: 300_000, max: 1_000 });
  assert.deepEqual(config.concurrency, { max: 64, perGuild: 8, maxPending: 256 });

  const bot = new Yuzuha({ ...config, logger: false });
  t.after(() => bot.destroy());
  await config.setup?.(bot);
  assert.equal(bot.isOwner('1473035660161241245'), true);
  assert.equal(bot.isOwner('123'), false);
});
