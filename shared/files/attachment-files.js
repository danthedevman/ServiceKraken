/* eslint no-control-regex: "off" -- Control characters are intentionally rejected or neutralized. */
import { InputError } from '../validation/input-error.js';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS = 20;
export const FILE_ACCEPT =
  '.pdf,.txt,.csv,.log,.json,.md,.png,.jpg,.jpeg,.gif,.webp,.zip,.docx,.xlsx,.pptx';
/** Infer inline image types from bytes; all other supported files are download-only. */
export function validateFile(filename, bytes) {
  const fail = (message) => {
    throw new InputError(message, 400);
  };
  if (
    typeof filename !== 'string' ||
    !filename.trim() ||
    filename.length > 180 ||
    /[\x00-\x1f\x7f/\\]/.test(filename)
  )
    fail('Use a filename up to 180 characters without path separators or control characters.');
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_FILE_BYTES)
    fail('Choose a nonempty file no larger than 5 MB.');
  const extension = filename.toLowerCase().split('.').at(-1);
  if (!FILE_ACCEPT.split(',').includes(`.${extension}`))
    fail(
      'This file type is not supported. Use images, PDF, text, ZIP, or modern Office documents.',
    );
  let mime = 'application/octet-stream';
  if (
    extension === 'png' &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    mime = 'image/png';
  if (
    ['jpg', 'jpeg'].includes(extension) &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    mime = 'image/jpeg';
  if (extension === 'gif' && ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii')))
    mime = 'image/gif';
  if (
    extension === 'webp' &&
    bytes.subarray(0, 4).toString() === 'RIFF' &&
    bytes.subarray(8, 12).toString() === 'WEBP'
  )
    mime = 'image/webp';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension) && !mime.startsWith('image/'))
    fail('The image contents do not match its filename.');
  return { name: filename.trim(), mime, size: bytes.length };
}
