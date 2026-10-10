import test from 'node:test';
import assert from 'node:assert/strict';
import { statusBackground, backgroundInk } from '../shared/status/appearance.js';
test('status appearance accepts only colors and chooses readable heading contrast', () => {
  assert.equal(statusBackground('#ABCDEF'), '#abcdef');
  assert.equal(statusBackground(''), null);
  assert.throws(() => statusBackground('url(https://example.test)'));
  assert.throws(() => statusBackground('#fff'));
  assert.equal(backgroundInk('#000000'), '#ffffff');
  assert.equal(backgroundInk('#ffffff'), '#000000');
});
