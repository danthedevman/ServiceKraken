import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

/** Accessible, dismissible outcome messages survive routing; errors remain until dismissed. */
export function Toasts() {
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    const timers = new Set();
    let nextId = 0;
    const receive = ({ detail }) => {
      const id = ++nextId;
      setMessages((items) => [...items.slice(-3), { ...detail, id }]);
      if (detail.tone !== 'error') {
        const timer = setTimeout(() => {
          setMessages((items) => items.filter((item) => item.id !== id));
          timers.delete(timer);
        }, 8000);
        timers.add(timer);
      }
    };
    window.addEventListener('servicekraken-toast', receive);
    return () => {
      window.removeEventListener('servicekraken-toast', receive);
      timers.forEach(clearTimeout);
    };
  }, []);
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
      aria-label="Action notifications"
    >
      {messages.map(({ id, message, tone }) => {
        const failure = tone === 'error';
        const Icon = failure ? ExclamationCircleIcon : CheckCircleIcon;
        return (
          <div
            key={id}
            role={failure ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 rounded-[4px] p-4 shadow-lg ${failure ? 'bg-red-800 text-white' : 'bg-emerald-800 text-white'}`}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1 break-words text-sm">{message}</p>
            <button
              type="button"
              className="shrink-0 p-1 hover:bg-white/15"
              aria-label="Dismiss notification"
              onClick={() => setMessages((items) => items.filter((item) => item.id !== id))}
            >
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
