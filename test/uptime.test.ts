import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot } from 'yuzuha/testing';
import uptime, { formatBootStamp, formatUptime } from '../commands/uptime.js';
import { emoji } from '../src/emoji.js';

test('formatUptime junta com vírgula e e com plural correto', () => {
  assert.equal(formatUptime(2 * 86400 + 3 * 3600 + 14 * 60), '**2 dias**, **3 horas** e **14 minutos**');
  assert.equal(formatUptime(86400), '**1 dia**');
  assert.equal(formatUptime(3600), '**1 hora**');
  assert.equal(formatUptime(60), '**1 minuto**');
  assert.equal(formatUptime(5), '**5 segundos**');
  assert.equal(formatUptime(0), '**alguns segundos**');
  assert.equal(formatUptime(2 * 86400 + 5), '**2 dias** e **5 segundos**');
  assert.equal(formatUptime(3661.9), '**1 hora**, **1 minuto** e **1 segundo**');
});

test('formatBootStamp usa dia/mês e hora:minuto com dois dígitos', () => {
  assert.equal(formatBootStamp(new Date(2026, 10, 1, 14, 32)), '**01/11 **às **14:32**');
  assert.equal(formatBootStamp(new Date(2026, 0, 9, 8, 5)), '**09/01 **às **08:05**');
});

test('uptime responde há quanto tempo está acordado', async (t) => {
  const fixture = createTestBot({ prefix: 'a.', commands: [uptime], emoji });
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.uptime'), 'success');
  const content = fixture.messages.at(-1)?.payload.content ?? '';
  assert.match(content, /^<:timefill:1567289278214438912> Eu estou acordado e na escuta há \*\*.+\*\* \(desde \*\*\d{2}\/\d{2} \*\*às \*\*\d{2}:\d{2}\*\*\)!$/);
});
