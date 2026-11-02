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
  yuzuha: '0.1.7',
  node: 'v22.13.0',
  cwd: '/tmp/ace',
};

test('o painel lista conta, comandos e o que recarrega', () => {
  const text = formatBanner(panel, false);
  assert.match(text, /\[ACE\] {2}DEV/);
  assert.match(text, /1565400101596172288/);
  assert.match(text, /prefix\s+a\./);
  assert.match(text, /guilds\s+2/);
  assert.match(text, /no sample yet/);
  assert.match(text, /a\.ping\s+Latência do Ace\./);
  assert.match(text, /a\.hello\s+Cumprimenta alguém\.\s+\(aliases: oi\)/);
  assert.match(text, /commands, mention, prefix, brand, join role & \.env PREFIX/);
  assert.match(text, /yuzuha.config.ts, cli & bot token/);
  assert.equal(text.includes('\x1b['), false);
  assert.equal(formatBanner({ ...panel, mode: 'start' }, false).includes('disabled'), true);
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
