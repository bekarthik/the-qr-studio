import { useEffect, useRef, useState } from 'react';
import { SOURCES, CATEGORY_ORDER, CATEGORY_META, SOURCE_CATEGORY } from '../ui/forms';
import { useGen } from '../state/GeneratorContext';

/**
 * Two-level source picker: a row of category icons ("source type") + a short
 * dropdown of the sources within the chosen category. The category is derived
 * from the current source (no extra state), so the dropdown only ever lists a
 * handful of entries instead of all sixteen.
 */
export function SourcePicker() {
  const { cfg, update } = useGen();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ddRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const currentCat = SOURCE_CATEGORY[cfg.type];
  const inCategory = SOURCES.filter((s) => SOURCE_CATEGORY[s.type] === currentCat);
  const current = SOURCES.find((s) => s.type === cfg.type)!;

  // Search spans ALL sources so "wifi" / "card" / "pay" finds the type without
  // knowing its category; matching ignores punctuation so "wifi" hits "Wi-Fi".
  // Empty query falls back to the current category.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const q = norm(query);
  const results = q
    ? SOURCES.filter(
        (s) =>
          norm(s.label).includes(q) ||
          norm(CATEGORY_META[SOURCE_CATEGORY[s.type]].label).includes(q),
      )
    : inCategory;

  const choose = (type: typeof cfg.type) => {
    update({ type });
    setQuery('');
    setOpen(false);
  };

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    searchRef.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pickCategory = (cat: (typeof CATEGORY_ORDER)[number]) => {
    const count = SOURCES.filter((s) => SOURCE_CATEGORY[s.type] === cat).length;
    if (cat === currentCat) {
      // same category — just toggle the list of its types
      setOpen((o) => (count > 1 ? !o : false));
      return;
    }
    const first = SOURCES.find((s) => SOURCE_CATEGORY[s.type] === cat);
    if (first) update({ type: first.type });
    // reveal the choices so the two-step picker is discoverable
    setOpen(count > 1);
  };

  return (
    <div className="picker">
      <div className="cat-row" role="tablist" aria-label="Source type">
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={cat === currentCat}
            className={'cat-chip' + (cat === currentCat ? ' is-active' : '')}
            onClick={() => pickCategory(cat)}
          >
            <span className="cat-chip__ico" aria-hidden="true">
              {CATEGORY_META[cat].icon}
            </span>
            <span className="cat-chip__label">{CATEGORY_META[cat].label}</span>
          </button>
        ))}
      </div>

      <div className="picker__dd" ref={ddRef}>
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
            <input
              ref={searchRef}
              type="text"
              className="picker__search"
              placeholder="Search all types — link, wifi, card, pay…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && results[0]) choose(results[0].type);
              }}
            />
            {results.length === 0 && <p className="picker__none">No matching source type.</p>}
            {results.map((s) => (
              <button
                key={s.type}
                type="button"
                role="option"
                aria-selected={s.type === cfg.type}
                className={'picker__opt' + (s.type === cfg.type ? ' is-active' : '')}
                onClick={() => choose(s.type)}
              >
                <span className="picker__ico" aria-hidden="true">
                  {s.icon}
                </span>
                <span className="picker__opt-label">{s.label}</span>
                {q && <span className="picker__opt-cat">{CATEGORY_META[SOURCE_CATEGORY[s.type]].label}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
