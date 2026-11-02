import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEnvPlan, fillMissingEnv, planEnv } from '../src/env-file.js';

test('o primeiro load não pisa no ambiente', () => {
  const env: NodeJS.ProcessEnv = { PREFIX: 'ja.', FLUXER_BOT_TOKEN: 'antigo' };
  fillMissingEnv('PREFIX=novo.\nFLUXER_BOT_TOKEN=secreto\nOUTRA=1\n', env);
  assert.equal(env.PREFIX, 'ja.');
  assert.equal(env.FLUXER_BOT_TOKEN, 'antigo');
  assert.equal(env.OUTRA, '1');
});

test('recarga troca PREFIX e ignora o token', () => {
  const env: NodeJS.ProcessEnv = { PREFIX: 'a.', FLUXER_BOT_TOKEN: 'antigo', COR: 'azul' };
  const plan = planEnv('PREFIX=b.\nFLUXER_BOT_TOKEN=novo\nCOR=azul\nEXTRA=2\n', env);
  assert.equal(plan.prefix, 'b.');
  assert.equal(plan.tokenChanged, true);
  assert.deepEqual(plan.assignments.map((item) => item.key).sort(), ['EXTRA', 'PREFIX']);
  applyEnvPlan(plan, env);
  assert.equal(env.PREFIX, 'b.');
  assert.equal(env.EXTRA, '2');
  assert.equal(env.FLUXER_BOT_TOKEN, 'antigo');
});

test('PREFIX vazio no arquivo volta pro fallback', () => {
  const plan = planEnv('PREFIX=   \n', { PREFIX: 'a.' });
  assert.equal(plan.prefix, 'a.');
  assert.equal(plan.tokenChanged, false);
});
