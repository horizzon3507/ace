import test from 'node:test';
import assert from 'node:assert/strict';
import { isBareMention, mentionMessage, unknownCommandMessage } from '../src/mention.js';

const self = '1565400101596172288';

test('menção pura monta o texto sem embed', () => {
  const text = mentionMessage('a.');
  assert.equal(text, '<:emotionhappyfill:1566571242956263425> Heey! Me chamo **Ace**. Sou uma aplicação **multifuncional** para o Fluxer. Saiba mais usando `a.ajuda` e [me adicione](https://web.fluxer.app/oauth2/authorize?client_id=1565400101596172288&scope=bot&permissions=18014398509829120) em seu servidor!');
});

test('comando inexistente avisa e aponta a ajuda', () => {
  const text = unknownCommandMessage('a.nope', 'a.', ['ping', 'hello', 'ajuda']);
  assert.equal(text, '<:emotionunhappyfill:1566571242956263424> Infelizmente, eu **não consegui encontrar nenhum comando** com este nome.\n-# ╰ Psst, você pode usar `a.ajuda` para ver meus comandos!');
  assert.equal(unknownCommandMessage('a.ajuda', 'a.', ['ajuda']), undefined);
  assert.equal(unknownCommandMessage('a.Ping', 'a.', ['ping']), undefined);
  assert.equal(unknownCommandMessage('a.', 'a.', ['ping']), undefined);
  assert.equal(unknownCommandMessage('oi', 'a.', ['ping']), undefined);
});

test('só a menção ao Ace dispara', () => {
  assert.equal(isBareMention(`<@${self}>`, self, true), true);
  assert.equal(isBareMention(`<@!${self}>  `, self, true), true);
  assert.equal(isBareMention(`<@${self}> a.ping`, self, true), false);
  assert.equal(isBareMention('oi', self, false), false);
});
