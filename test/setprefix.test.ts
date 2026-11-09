import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot } from 'yuzuha/testing';
import setprefix from '../commands/setprefix.js';
import { bindGuildPrefixes, guildPrefix, setGuildPrefixCache } from '../src/guild-prefix.js';
import { emoji } from '../src/emoji.js';

const VAR = (guildID: string) => JSON.stringify(['guild', guildID, 'prefix']);

// MockTransport registra o autor admin só na guild '100'. O cache do módulo é
// compartilhado entre testes, então cada teste limpa a entrada ao terminar.
function bot() {
  const fixture = createTestBot({ prefix: 'a.', commands: [setprefix], emoji });
  bindGuildPrefixes(fixture.store);
  return fixture;
}

test('grava a variável da guild e confirma', async (t) => {
  const fixture = bot();
  t.after(() => { setGuildPrefixCache('100', undefined); return fixture.destroy(); });

  assert.equal(await fixture.send('a.setprefix x.'), 'success');
  assert.equal(await fixture.store.read((state) => state.variables[VAR('100')]), 'x.');
  assert.equal(await guildPrefix('100'), 'x.');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /agora é \*\*`x\.`\*\*!/);
});

test('sem argumento pede o prefixo novo', async (t) => {
  const fixture = bot();
  t.after(() => { setGuildPrefixCache('100', undefined); return fixture.destroy(); });

  assert.equal(await fixture.send('a.setprefix'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /me fornecer um prefixo novo/);
});

test('reset remove a variável e volta ao padrão', async (t) => {
  const fixture = bot();
  t.after(() => { setGuildPrefixCache('100', undefined); return fixture.destroy(); });

  assert.equal(await fixture.send('a.setprefix x.'), 'success');
  await fixture.tick(3_100);
  assert.equal(await fixture.send('a.setprefix reset'), 'success');
  assert.equal(await fixture.store.read((state) => state.variables[VAR('100')]), undefined);
  assert.equal(await guildPrefix('100'), undefined);
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /voltou para \*\*`a\.`\*\*!/);
});

test('prefixo longo demais é recusado sem gravar', async (t) => {
  const fixture = bot();
  t.after(() => { setGuildPrefixCache('100', undefined); return fixture.destroy(); });

  assert.equal(await fixture.send('a.setprefix abcdefghijk'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /muito longo/);
  assert.equal(await fixture.store.read((state) => state.variables[VAR('100')]), undefined);
});
