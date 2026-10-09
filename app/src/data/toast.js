/** Announce explicit user-action outcomes without persisting messages or exposing response payloads. */
export function notify(message, tone = 'success') {
  if (typeof window !== 'undefined')
    window.dispatchEvent(new CustomEvent('servicetrident-toast', { detail: { message, tone } }));
}
