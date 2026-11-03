import test from 'node:test';
import assert from 'node:assert/strict';
import { YuzuhaError } from 'yuzuha';
import { clock, explain, gatewayDetail, redact, usage } from '../src/cli-util.js';
import { relativeChange } from '../src/dev-reload.js';

test('redact mascara o token em qualquer tamanho', (t) => {
  const previous = process.env.FLUXER_BOT_TOKEN;
  t.after(() => { previous === undefined ? delete process.env.FLUXER_BOT_TOKEN : process.env.FLUXER_BOT_TOKEN = previous; });
  process.env.FLUXER_BOT_TOKEN = 'segredo123';
  assert.equal(redact('falhou com segredo123 no header'), 'falhou com [token] no header');
  assert.equal(redact('segredo123 segredo123'), '[token] [token]');
  process.env.FLUXER_BOT_TOKEN = 'ab';
  assert.equal(redact('token ab vazou'), 'token [token] vazou');
  delete process.env.FLUXER_BOT_TOKEN;
  assert.equal(redact('ab ab'), 'ab ab');
});

test('gatewayDetail traduz os erros do gateway', () => {
  assert.equal(gatewayDetail(new Error('authentication failed (4004)')), 'token recusado (4004). Confira FLUXER_BOT_TOKEN e reinicie.');
  assert.equal(gatewayDetail(new Error('WebSocket error')), 'conexão perdida. O Fluxer tenta de novo.');
  assert.equal(gatewayDetail(new Error('outra coisa')), null);
  assert.equal(gatewayDetail('4004'), null);
});

test('usage lidera com os scripts npm', () => {
  const text = usage();
  assert.match(text, /npm run dev/);
  assert.match(text, /npm start/);
  assert.match(text, /npm run check/);
  assert.match(text, /npm test/);
});

test('clock formata HH:MM:SS sem depender de ICU', () => {
  assert.match(clock(), /^\d{2}:\d{2}:\d{2}$/);
});

test('explain prefere o código do YuzuhaError e cobre o resto', () => {
  assert.equal(explain(new YuzuhaError('CONFIG_MISSING', 'arquivo não encontrado.')), 'CONFIG_MISSING  arquivo não encontrado.');
  assert.equal(explain(new Error('invalid or expired authorization token')), 'token recusado. Confira FLUXER_BOT_TOKEN.');
  assert.equal(explain(new Error('boom')), 'boom');
  assert.equal(explain('texto solto'), 'texto solto');
});

test('relativeChange recusa caminhos fora da raiz', () => {
  const root = '/root/ace';
  assert.equal(relativeChange(root, 'src/ping.ts'), 'src/ping.ts');
  assert.equal(relativeChange(root, '/root/ace/src/ping.ts'), 'src/ping.ts');
  assert.equal(relativeChange(root, '../fora.ts'), undefined);
  assert.equal(relativeChange(root, '/outro/lugar.ts'), undefined);
});
