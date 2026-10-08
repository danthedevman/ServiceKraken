import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { BODY_LIMIT, captureBody, redactHeaders } from '../workers/src/monitoring/response.js';
import { checkWebsite } from '../workers/src/monitoring/check.js';

/** @param {object} [headers] @returns {PassThrough} HTTP-like stream for bounded capture tests. */
function responseStream(headers = { 'content-type': 'text/html' }) {
  return Object.assign(new PassThrough(), { headers });
}

test('captures HTML as text and redacts sensitive headers without losing ordinary headers', async () => {
  const response = responseStream();
  const captured = captureBody(response, new AbortController().signal, {});
  response.end('<script>alert("untrusted")</script>');
  const { body } = await captured;
  assert.equal(body.text, '<script>alert("untrusted")</script>');
  assert.equal(body.truncated, false);
  assert.equal(body.error, null);
  assert.deepEqual(
    redactHeaders({
      server: 'example',
      'set-cookie': ['secret=yes'],
      'x-api-key': 'secret',
      'x-auth-token': 'secret',
    }),
    {
      server: 'example',
      'set-cookie': '[redacted]',
      'x-api-key': '[redacted]',
      'x-auth-token': '[redacted]',
    },
  );
});

test('caps body storage and destroys the stream after reaching the limit', async () => {
  const response = responseStream();
  const captured = captureBody(response, new AbortController().signal, {});
  response.end(Buffer.alloc(BODY_LIMIT * 10, 'a'));
  const { body } = await captured;
  assert.equal(body.bytesCaptured, BODY_LIMIT);
  assert.equal(body.text.length, BODY_LIMIT);
  assert.equal(body.truncated, true);
  assert.equal(response.destroyed, true);
});

test('does not attempt to decode binary or compressed content', async () => {
  for (const headers of [
    { 'content-type': 'image/png' },
    { 'content-type': 'text/html', 'content-encoding': 'gzip' },
  ]) {
    const response = responseStream(headers);
    const { body } = await captureBody(response, new AbortController().signal, {});
    assert.ok(body.omitted);
    assert.equal(body.bytesCaptured, 0);
    assert.equal(response.destroyed, true);
  }
});

test('keeps partial text and a capture error when a body times out', async () => {
  const response = responseStream();
  const controller = new AbortController();
  const captured = captureBody(response, controller.signal, {});
  response.write('partial response');
  controller.abort();
  const { body } = await captured;
  assert.equal(body.text, 'partial response');
  assert.match(body.error, /timed out/);
});

test('stores every redirect response and the final request URL', async () => {
  let calls = 0;
  const result = await checkWebsite('https://example.com', {
    followRedirects: true,
    fetchHeaders: async () =>
      ++calls === 1
        ? { statusCode: 301, location: '/new', headers: { location: '/new' } }
        : {
            statusCode: 200,
            headers: { 'content-type': 'text/plain' },
            body: { text: 'hello', bytesCaptured: 5 },
          },
  });
  assert.equal(result.details.responses.length, 2);
  assert.equal(result.details.finalUrl, 'https://example.com/new');
  assert.equal(result.details.responses[1].body.text, 'hello');
});
