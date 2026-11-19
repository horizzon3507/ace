import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { buildZip, compareSnowflakeDesc } from '../src/emoji-dump.js';
import { isBareMention, unknownCommandMessage } from '../src/mention.js';
import { classifyChange } from '../src/watch-plan.js';

test('buildZip empacota 100 entradas em alocacao unica com baixa latencia', () => {
  const payload = new Uint8Array(256).fill(7);
  const entries = Array.from({ length: 100 }, (_, i) => ({ name: `e_${i}.png`, data: payload }));
  const t0 = performance.now();
  const zip = buildZip(entries);
  const dt = performance.now() - t0;
  assert.ok(zip.byteLength > 25_600);
  assert.ok(dt < 500, `buildZip demorou ${dt.toFixed(1)}ms`);
});

test('compareSnowflakeDesc, classifyChange e unknownCommandMessage mantem throughput alto', () => {
  const ids = Array.from({ length: 1000 }, (_, i) => String(1_500_000_000_000_000_000n + BigInt((i * 7919) % 1000)));
  const commands = Object.freeze(['ajuda', 'ping', 'uptime', 'ban', 'kick', 'autorole', 'userinfo']);

  const t0 = performance.now();
  ids.sort(compareSnowflakeDesc);
  for (let i = 0; i < 5000; i += 1) {
    classifyChange('commands/ping.ts');
    classifyChange('src/mention.ts');
    unknownCommandMessage('a.ping', 'a.', commands);
    isBareMention('<@1565400101596172288>', '1565400101596172288', true);
  }
  const dt = performance.now() - t0;
  assert.ok(BigInt(ids[0]!) >= BigInt(ids[ids.length - 1]!));
  assert.ok(dt < 500, `lote de hot-path demorou ${dt.toFixed(1)}ms`);
});
