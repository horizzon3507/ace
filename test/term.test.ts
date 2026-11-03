import test from 'node:test';
import assert from 'node:assert/strict';
import { formatBanner, formatConnecting, formatLine, useColor, type Panel } from '../src/term.js';

const panel: Panel = {
  mode: 'dev',
  displayName: 'Ace',
  username: 'Ace',
  id: '1565400101596172288',
  prefix: 'a.',
  guilds: 2,
  ping: 0,
  commands: [
    { name: 'ping', description: 'Latência do Ace.' },
    { name: 'hello', description: 'Cumprimenta alguém.', aliases: ['oi'] },
  ],
  version: '0.1.0',
  yuzuha: '0.1.7',
  node: 'v22.13.0',
  cwd: '/tmp/ace',
};

test('o painel lista conta, comandos e o que recarrega', () => {
  const text = formatBanner(panel, false);
  assert.match(text, /\[ACE\] {2}DEV/);
  assert.match(text, /1565400101596172288/);
  assert.match(text, /prefixo\s+a\./);
  assert.match(text, /servidores\s+2/);
  assert.match(text, /sem amostra/);
  assert.match(text, /Comandos \(2\)/);
  assert.match(text, /a\.hello {2}Cumprimenta alguém\.\n {11}oi/);
  assert.match(text, /a\.ping\s+Latência do Ace\./);
  assert.match(text, /comandos, menção, prefixo, marca, cargo, kick\/ban e PREFIX/);
  assert.match(text, /yuzuha.config.ts, a cli e o token/);
  assert.match(text, /ace 0\.1\.0 {3}yuzuha 0\.1\.7 {3}node v22\.13\.0/);
  assert.equal(text.indexOf('a.hello'), text.lastIndexOf('a.hello'));
  assert.ok(text.indexOf('a.hello') < text.indexOf('a.ping'));
  assert.equal(text.includes('\x1b['), false);
  assert.match(formatBanner({ ...panel, mode: 'start' }, false), /desligado \(npm run dev\)/);
  assert.match(formatConnecting('dev', false), /\[ACE\] {2}DEV {2}conectando ao Fluxer/);
});

test('a marca usa o cornflower com texto escuro, e NO_COLOR desliga a cor', () => {
  const marked = formatConnecting('dev', true);
  assert.match(marked, /\x1b\[48;2;100;141;229m/);
  assert.match(marked, /\x1b\[38;2;23;23;23m/);
  assert.equal(formatConnecting('dev', false).includes('\x1b['), false);
  assert.equal(useColor({ isTTY: true }, {}), true);
  assert.equal(useColor({ isTTY: true }, { NO_COLOR: '' }), false);
  assert.equal(useColor({ isTTY: false }, {}), false);
  const line = formatLine('10:00:00', 'erro', 'primeira\nsegunda', false);
  assert.match(line, /^10:00:00 {2}erro {6}primeira\n {20}segunda$/);
});

test('FORCE_COLOR vence o TTY e 0/false desliga', () => {
  assert.equal(useColor({ isTTY: false }, { FORCE_COLOR: '1' }), true);
  assert.equal(useColor({ isTTY: true }, { FORCE_COLOR: '0' }), false);
  assert.equal(useColor({ isTTY: true }, { FORCE_COLOR: 'false' }), false);
  assert.equal(useColor({ isTTY: true }, { FORCE_COLOR: '1', NO_COLOR: '1' }), true);
});

test('labels de erro e gateway ganham cor própria', () => {
  assert.match(formatLine('10:00:00', 'erro', 'falhou', true), /\x1b\[31merro {6}/);
  assert.match(formatLine('10:00:00', 'gateway', 'caiu', true), /\x1b\[33mgateway {3}/);
  assert.match(formatLine('10:00:00', 'saindo', 'tchau', true), /\x1b\[33msaindo {4}/);
  assert.doesNotMatch(formatLine('10:00:00', 'env', 'ok', true), /\x1b\[3[13]menv/);
});

test('label maior que a coluna é truncada sem desalinhar', () => {
  const line = formatLine('10:00:00', 'rotulomuitolongo', 'detalhe', false);
  assert.match(line, /^10:00:00 {2}rotulomuitdetalhe$/);
});

test('latência aparece arredondada no painel', () => {
  assert.match(formatBanner({ ...panel, ping: 42.7 }, false), /latência\s+43 ms/);
});
