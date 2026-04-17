import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './cn.js';

// Pelayo Dialog. Clay surface, 8px radius, shadow-3, 32px padding, icon-only close top-right.
// Controlled via `open` + `onOpenChange`. Escape closes. Clicks on overlay close.

export default function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  footer,
  hideClose = false,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onOpenChange?.(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onOpenChange?.(false);
  };

  return createPortal(
    <div
      role="presentation"
      onMouseDown={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-onyx/70 backdrop-blur-sm animate-fade-up"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'pelayo-dialog-title' : undefined}
        aria-describedby={description ? 'pelayo-dialog-desc' : undefined}
        ref={dialogRef}
        className={cn(
          'relative w-full max-w-md mx-4 p-8 bg-clay border border-ash rounded-lg shadow-3 text-ivory',
          className,
        )}
      >
        {!hideClose && (
          <button
            type="button"
            onClick={() => onOpenChange?.(false)}
            aria-label="Close"
            className="absolute top-4 right-4 inline-flex items-center justify-center h-8 w-8 rounded-md text-oat hover:text-ivory hover:bg-ash/60 transition duration-180 ease-out-quart focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        )}
        {(title || description) && (
          <header className="mb-6 flex flex-col gap-2 pr-8">
            {title && (
              <h2
                id="pelayo-dialog-title"
                className="font-display font-light text-h2 text-ivory"
              >
                {title}
              </h2>
            )}
            {description && (
              <p id="pelayo-dialog-desc" className="text-body text-oat">
                {description}
              </p>
            )}
          </header>
        )}
        <div className="text-body text-oat">{children}</div>
        {footer && (
          <footer className="mt-8 flex items-center justify-end gap-3">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
