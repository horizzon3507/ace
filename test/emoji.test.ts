import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_EMOJI_KEYS, emoji } from '../src/emoji.js';

test('todas as entradas do catalogo de emojis tem formato de tag customizado valido', () => {
  const keys = Object.keys(emoji);
  assert.equal(Object.isFrozen(DEFAULT_EMOJI_KEYS), true);
  assert.deepEqual(DEFAULT_EMOJI_KEYS, keys);
  for (const key of DEFAULT_EMOJI_KEYS) {
    assert.match(emoji[key], /^<a?:[a-z0-9_]+:\d+>$/, key);
  }
});
