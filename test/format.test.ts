import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAge, formatDayStamp, formatStamp } from '../src/format.js';

const DAY_MS = 86_400_000;

test('formatStamp e formatDayStamp formatam datas com dois digitos', () => {
  const sample = new Date(2026, 2, 5, 7, 9);
  assert.equal(formatStamp(sample), '**05/03 **às **07:09**');
  assert.equal(formatDayStamp(sample), '**05/03/2026 **às **07:09**');
});

test('formatAge cobre horas, dias, meses, anos e datas futuras', () => {
  const now = Date.UTC(2026, 10, 18);
  assert.equal(formatAge(new Date(now - 3_600_000), now), 'há **poucas horas**');
  assert.equal(formatAge(new Date(now + 10 * DAY_MS), now), 'há **poucas horas**');
  assert.equal(formatAge(new Date(now - 1 * DAY_MS), now), 'há **1 dia**');
  assert.equal(formatAge(new Date(now - 12 * DAY_MS), now), 'há **12 dias**');
  assert.equal(formatAge(new Date(now - 35 * DAY_MS), now), 'há **1 mês**');
  assert.equal(formatAge(new Date(now - 90 * DAY_MS), now), 'há **3 meses**');
  assert.equal(formatAge(new Date(now - 400 * DAY_MS), now), 'há **1 ano**');
  assert.equal(formatAge(new Date(now - 800 * DAY_MS), now), 'há **2 anos**');
});
