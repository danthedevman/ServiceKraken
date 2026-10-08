import React from 'react';

/** Native boolean switch preserves form submission, labels, focus, and Space-key behavior.
 * Place inside a label or provide aria-label/aria-labelledby, as for any form control.
 * @param {React.InputHTMLAttributes<HTMLInputElement>} props
 */
export function Toggle({ className = '', ...props }) {
  return (
    <input {...props} type="checkbox" role="switch" className={`setting-toggle ${className}`} />
  );
}
