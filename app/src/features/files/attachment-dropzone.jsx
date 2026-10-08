import React, { useId, useRef, useState } from 'react';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { notify } from '../../data/toast.js';

/** Keyboard-accessible file selection and drops share the same bounded upload path. */
export function AttachmentDropzone({ accept, disabled, onUpload, onError }) {
  const input = useRef(null),
    active = useRef(false),
    hintId = useId();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  async function receive(list) {
    if (disabled || active.current) return;
    const files = Array.from(list ?? []);
    if (!files.length) return;
    active.current = true;
    setUploading(true);
    try {
      if (files.length > 20) throw new Error('Choose no more than 20 files at once.');
      for (const file of files) {
        const extension = '.' + file.name.split('.').at(-1).toLowerCase();
        if (!accept.split(',').includes(extension))
          throw new Error(`Unsupported file type: ${file.name}`);
        if (!file.size || file.size > 5 * 1024 * 1024)
          throw new Error('Choose nonempty files no larger than 5 MB each.');
      }
      for (const file of files) await onUpload(file);
    } catch (error) {
      onError(error.message);
      // API failures already have toasts; local file validation needs its own feedback.
      if (!error.notified) notify(error.message, 'error');
    } finally {
      active.current = false;
      setUploading(false);
    }
  }
  const busy = disabled || uploading;
  return (
    <div className="w-full space-y-2">
      <input
        ref={input}
        className="sr-only"
        type="file"
        aria-label="Choose attachments"
        accept={accept}
        multiple
        disabled={busy}
        tabIndex={-1}
        onChange={(event) => {
          const files = event.target.files;
          void receive(files);
          event.target.value = '';
        }}
      />
      <button
        type="button"
        className={`attachment-dropzone ${dragging ? 'is-dragging' : ''}`}
        disabled={busy}
        aria-describedby={hintId}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void receive(event.dataTransfer.files);
        }}
      >
        <ArrowUpTrayIcon className="h-7 w-7" aria-hidden="true" />
        <span className="font-medium">
          {uploading ? 'Uploading attachments…' : 'Choose files or drag and drop'}
        </span>
        <span className="text-xs font-normal">Documents, images, logs, and ZIP files</span>
      </button>
      <p id={hintId} className="text-xs text-slate-500">
        Up to 20 attachments per record, including embedded images · 5 MB per file
      </p>
    </div>
  );
}
