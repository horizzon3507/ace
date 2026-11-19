import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGitHubSlug } from '../src/deploy-watch.js';

test('parseGitHubSlug extrai owner/repo de URLs HTTPS e SSH', () => {
  assert.equal(parseGitHubSlug('https://github.com/horizzon3507/ace.git'), 'horizzon3507/ace');
  assert.equal(parseGitHubSlug('https://github.com/horizzon3507/ace'), 'horizzon3507/ace');
  assert.equal(parseGitHubSlug('git@github.com:horizzon3507/ace.git'), 'horizzon3507/ace');
  assert.equal(parseGitHubSlug('https://gitlab.com/org/repo.git'), undefined);
});
