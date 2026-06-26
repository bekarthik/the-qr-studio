import { useEffect, useRef, useState } from 'react';
import { SOURCES, CATEGORY_ORDER, SOURCE_CATEGORY } from '../ui/forms';
import { useGen } from '../state/GeneratorContext';

/**
 * Compact, grouped source picker. A single trigger that opens an overlay menu
 * organised by category — so the list scales to many sources without a wall of
 * pills, and choosing a source never reflows the page (the trigger stays put;
 * only the form below it changes).
 */
export function SourcePicker() {
  const { cfg, update } = useGen();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SOURCES.find((s) => s.type === cfg.type)!;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="picker" ref={ref}>
      <button
        type="button"
        className="picker__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="picker__ico" aria-hidden="true">
          {current.icon}
        </span>
        <span className="picker__label">{current.label}</span>
        <span className="picker__caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="picker__menu" role="listbox">
          {CATEGORY_ORDER.map((cat) => {
            const items = SOURCES.filter((s) => SOURCE_CATEGORY[s.type] === cat);
            if (!items.length) return null;
            return (
              <div className="picker__group" key={cat}>
                <div className="picker__cat">{cat}</div>
                {items.map((s) => (
                  <button
                    key={s.type}
                    type="button"
                    role="option"
                    aria-selected={s.type === cfg.type}
                    className={'picker__opt' + (s.type === cfg.type ? ' is-active' : '')}
                    onClick={() => {
                      update({ type: s.type });
                      setOpen(false);
                    }}
                  >
                    <span className="picker__ico" aria-hidden="true">
                      {s.icon}
                    </span>
                    {s.label}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
