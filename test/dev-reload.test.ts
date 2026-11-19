import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Yuzuha } from 'yuzuha';
import { applyChanges } from '../src/dev-reload.js';

test('applyChanges aplica .env e recarrega comandos quando modificado', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'ace-reload-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const prevExtra = process.env.ACE_TEST_VAR;
  t.after(() => {
    if (prevExtra === undefined) delete process.env.ACE_TEST_VAR;
    else process.env.ACE_TEST_VAR = prevExtra;
  });

  writeFileSync(join(dir, '.env'), 'ACE_TEST_VAR=ok123\n', 'utf8');
  let reloaded = false;
  const fakeBot = {
    async reload() { reloaded = true; },
    listCommands() { return [{ name: 'ping', hidden: false }]; },
  } as unknown as Yuzuha;

  await applyChanges(dir, fakeBot, join(dir, 'commands'), new Set(), [join(dir, '.env')]);
  assert.equal(process.env.ACE_TEST_VAR, 'ok123');
  assert.equal(reloaded, false);
});
