import React, { createContext, useContext, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export const RecordHeaderContext = createContext(null);

/** Render record controls inside the shell’s shared sticky breadcrumb header. */
export function RecordHeader({ children }) {
  const target = useContext(RecordHeaderContext);
  return target ? createPortal(children, target) : children;
}

export const RecordActionContext = createContext(null);

/** Move existing form actions into the record toolbar while preserving native form submission. */
export function RecordActions({ children }) {
  const toolbar = useContext(RecordActionContext);
  const anchor = useRef(null);
  const generatedId = useId();
  const [formId, setFormId] = useState(null);
  useLayoutEffect(() => {
    const form = anchor.current?.closest('form');
    if (!form) return;
    if (!form.id) form.id = generatedId;
    setFormId(form.id);
  }, [generatedId]);
  const associate = (nodes) =>
    React.Children.map(nodes, (child) => {
      if (!React.isValidElement(child)) return child;
      if (child.type === React.Fragment)
        return React.cloneElement(child, {}, associate(child.props.children));
      return child.type === 'button' ? React.cloneElement(child, { form: formId }) : child;
    });
  const actions = <div className="form-actions">{associate(children)}</div>;
  return (
    <>
      <span ref={anchor} hidden />
      {toolbar && formId ? createPortal(actions, toolbar) : actions}
    </>
  );
}
