import React from 'react';

/** Decorative placeholder; the owning loading region supplies one accessible status. */
export function Skeleton({ className = '', style }) {
  return <span aria-hidden="true" className={`skeleton ${className}`} style={style} />;
}

/** Match the form's vertical field rhythm using its available schema, without fake controls. */
export function FormSkeleton({ fields, label = 'Loading form…', className = '', actions = true }) {
  return (
    <section className={`form-body ${className}`} role="status" aria-label={label} aria-busy="true">
      <span className="sr-only">{label}</span>
      {fields
        .filter((field) => !field.archived)
        .map((field, index) => {
          const long =
            field.type === 'textarea' || ['description', 'resolutionNotes'].includes(field.id);
          return (
            <div key={field.id ?? index} aria-hidden="true">
              <Skeleton className="h-5 w-28" />
              <Skeleton
                className="mt-2 w-full"
                style={{ height: field.id === 'content' ? 300 : long ? 96 : 46 }}
              />
            </div>
          );
        })}
      {actions && (
        <div className="form-actions" aria-hidden="true">
          <Skeleton className="h-11 w-24" />
          <Skeleton className="h-11 w-24" />
        </div>
      )}
    </section>
  );
}
