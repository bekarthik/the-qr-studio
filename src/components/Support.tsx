import { useEffect, useState, type ReactNode } from 'react';
import {
  SUPPORT_METHODS,
  SUPPORT_ENABLED,
  SUPPORT_HEADLINE,
  SUPPORT_BLURB,
} from '../config/support';

function SupportModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Support QR Studio" onClick={onClose}>
      <div className="modal__box" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <div className="modal__emoji" aria-hidden="true">
          ☕
        </div>
        <h2 className="modal__title">{SUPPORT_HEADLINE}</h2>
        <p className="modal__blurb">{SUPPORT_BLURB}</p>
        <div className="modal__methods">
          {SUPPORT_METHODS.map((m) => (
            <a
              key={m.id}
              className="support-method"
              href={m.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="support-method__ico" aria-hidden="true">
                {m.icon}
              </span>
              <span className="support-method__text">
                {m.label}
                {m.hint && <small>{m.hint}</small>}
              </span>
              <span className="support-method__arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          ))}
        </div>
        <p className="modal__fineprint">Payments are handled by the provider you choose. Thank you! 🙏</p>
      </div>
    </div>
  );
}

/** A trigger that opens the support modal. `children` lets it look like a nav
 *  pill or a plain footer link depending on where it's used. */
export function SupportButton({ className, children }: { className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!SUPPORT_ENABLED) return null;
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && <SupportModal onClose={() => setOpen(false)} />}
    </>
  );
}
