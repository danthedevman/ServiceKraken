import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRichContent,
  textDocument,
  safeLink,
  embeddedImageIds,
} from '../shared/files/rich-content.js';
import { validateFile, MAX_FILE_BYTES } from '../shared/files/attachment-files.js';

const imageId = 'a'.repeat(24),
  image = {
    type: 'image',
    attrs: { src: `/api/attachments/files/${imageId}/preview`, alt: 'Screenshot' },
  };
test('rich documents preserve text and local images while normalizing marks', () => {
  const result = validateRichContent({
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2, onerror: 'alert(1)' },
        content: [{ type: 'text', text: 'Runbook', marks: [{ type: 'bold' }] }],
      },
      image,
    ],
  });
  assert.equal(result.text, 'Runbook\nScreenshot');
  assert.deepEqual(result.imageIds, [imageId]);
  assert.equal(result.document.content[0].attrs.onerror, undefined);
  assert.equal(
    validateRichContent(textDocument('<script>alert(1)</script>')).text,
    '<script>alert(1)</script>',
  );
  assert.equal(safeLink('javascript:alert(1)'), false);
  assert.equal(safeLink('https://example.com/help'), true);
});
test('rich content rejects arbitrary HTML, external images, scripts, empty and oversized trees', () => {
  for (const document of [
    { type: 'doc', content: [{ type: 'iframe', attrs: { src: 'https://example.com' } }] },
    { type: 'doc', content: [{ ...image, attrs: { src: 'https://example.com/tracker.png' } }] },
    {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Bad',
              marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
            },
          ],
        },
      ],
    },
    textDocument(''),
    textDocument('x'.repeat(30001)),
  ])
    assert.throws(() => validateRichContent(document));
});
test('file validation bounds uploads and rejects active formats, paths, and spoofed images', () => {
  assert.equal(validateFile('notes.txt', Buffer.from('hello')).mime, 'application/octet-stream');
  for (const name of [
    'script.html',
    'image.svg',
    'app.exe',
    '../notes.txt',
    'a\r\nb.txt',
    'fake.png',
  ])
    assert.throws(() => validateFile(name, Buffer.from('<script>bad</script>')));
  assert.throws(() => validateFile('big.txt', Buffer.alloc(MAX_FILE_BYTES + 1)));
  assert.throws(() => validateFile('empty.txt', Buffer.alloc(0)));
});

test('only embedded image files are separated from ordinary attachments', () => {
  const document = {
    type: 'doc',
    content: [
      image,
      image,
      { type: 'paragraph', content: [{ type: 'text', text: image.attrs.src }] },
      { type: 'image', attrs: { src: 'https://example.com/image.png' } },
    ],
  };
  assert.deepEqual(embeddedImageIds(document), [imageId]);
  assert.deepEqual(embeddedImageIds(textDocument(image.attrs.src)), []);
  assert.deepEqual(embeddedImageIds(null), []);
});
