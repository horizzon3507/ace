import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from 'yuzuha';
import { bindGuildPrefixes, clearGuildPrefixCache, guildPrefix, setGuildPrefixCache } from '../src/guild-prefix.js';

const VAR = (guildID: string) => JSON.stringify(['guild', guildID, 'prefix']);

// Ordem importa: o store ligado é estado de módulo. Este teste roda antes de qualquer bind.
test('sem store ligado resolve undefined', async () => {
  assert.equal(await guildPrefix('g0'), undefined);
  assert.equal(await guildPrefix(undefined), undefined);
});

test('lê a variável da guild e serve o cache nas próximas', async () => {
  const store = new MemoryStore();
  bindGuildPrefixes(store);
  await store.update((state) => { state.variables[VAR('g1')] = 'x.'; });

  assert.equal(await guildPrefix('g1'), 'x.');
  await store.update((state) => { state.variables[VAR('g1')] = 'y.'; });
  assert.equal(await guildPrefix('g1'), 'x.');
  setGuildPrefixCache('g1', 'y.');
  assert.equal(await guildPrefix('g1'), 'y.');
});

test('falta de variável também é cacheada', async () => {
  const store = new MemoryStore();
  bindGuildPrefixes(store);

  assert.equal(await guildPrefix('g2'), undefined);
  await store.update((state) => { state.variables[VAR('g2')] = 'z.'; });
  assert.equal(await guildPrefix('g2'), undefined);
});

test('valor inválido é ignorado', async () => {
  const store = new MemoryStore();
  bindGuildPrefixes(store);
  await store.update((state) => {
    state.variables[VAR('g3')] = 'com espaço';
    state.variables[VAR('g4')] = 42;
  });

  assert.equal(await guildPrefix('g3'), undefined);
  assert.equal(await guildPrefix('g4'), undefined);
});


test('leituras concorrentes coalescem para uma chamada no store e clear limpa cache', async () => {
  let reads = 0;
  const base = new MemoryStore();
  await base.update((state) => { state.variables[VAR('g_conc')] = '!'; });
  bindGuildPrefixes({
    read: (fn) => { reads += 1; return base.read(fn); },
    update: (fn) => base.update(fn),
    readVariable: (key, now) => { reads += 1; return base.readVariable(key, now); },
  });
  const [a, b, c] = await Promise.all([guildPrefix('g_conc'), guildPrefix('g_conc'), guildPrefix('g_conc')]);
  assert.equal(a, '!');
  assert.equal(b, '!');
  assert.equal(c, '!');
  assert.equal(reads, 1);
  clearGuildPrefixCache();
  assert.equal(await guildPrefix('g_conc'), '!');
  assert.equal(reads, 2);
});
