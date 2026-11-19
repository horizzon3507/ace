import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestBot } from 'yuzuha/testing';
import softban from '../commands/softban.js';
import { emoji } from '../src/emoji.js';

function bot() {
  return createTestBot({
    prefix: 'a.',
    commands: [softban],
    emoji,
    resources: {
      users: {
        async member(_g: string, id: string) {
          if (id === '2') {
            return {
              id: '2', username: 'alvo', displayName: 'Alvo', bot: false,
              avatarURL: null, bannerURL: null, createdTimestamp: 0,
              nickname: null, joinedTimestamp: 0, roles: [], permissions: '0', timedOutUntil: null,
            };
          }
          throw Object.assign(new Error('missing'), { status: 404 });
        },
      },
    },
  });
}

test('softban sem argumento orienta uso e sem permissao barra autor', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.softban'), 'success');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /a\.softban @usuario motivo/);

  fixture.transport.setMember('100', { id: '1', owner: false, permissions: 0n, rank: 1 });
  fixture.clock.advance(4_000);
  assert.equal(await fixture.send('a.softban <@2>'), 'guarded');
  assert.match(fixture.messages.at(-1)?.payload.content ?? '', /BanMembers/);
});

test('softban executa ban e unban com motivo limpo', async (t) => {
  const fixture = bot();
  t.after(() => fixture.destroy());

  assert.equal(await fixture.send('a.softban <@2> flood <@1>'), 'success');
  const banAction = fixture.transport.actions.at(-2);
  const unbanAction = fixture.transport.actions.at(-1);
  assert.equal(banAction?.action, 'ban');
  assert.equal(banAction?.reason, 'flood');
  assert.equal(unbanAction?.action, 'unban');
});
