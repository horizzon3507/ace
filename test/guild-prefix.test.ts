import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from 'yuzuha';
import { bindGuildPrefixes, guildPrefix, setGuildPrefixCache } from '../src/guild-prefix.js';

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
