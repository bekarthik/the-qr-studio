import { useEffect, useState } from 'react';

type Theme = 'linen' | 'graphite' | 'midnight';
const LS = 'qrstudio.theme';

/** Each theme is shown as a mini swatch of its actual background + accent, so
 *  the choice is recognised at a glance instead of decoded from an icon. */
const THEMES: { id: Theme; label: string; bg: string; accent: string }[] = [
  { id: 'linen', label: 'Linen — warm light', bg: '#f5f2ec', accent: '#e85431' },
  { id: 'graphite', label: 'Graphite — cool light', bg: '#eef0f3', accent: '#ff5a36' },
  { id: 'midnight', label: 'Midnight — dark', bg: '#1b2230', accent: '#ff6a42' },
];

function apply(t: Theme) {
  if (t === 'linen') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('linen');

  useEffect(() => {
    let saved: Theme = 'linen';
    try {
      const raw = localStorage.getItem(LS) as Theme | null;
      if (raw === 'graphite' || raw === 'midnight' || raw === 'linen') saved = raw;
    } catch {
      /* ignore */
    }
    apply(saved);
    setTheme(saved);
  }, []);

  const pick = (t: Theme) => {
    setTheme(t);
    apply(t);
    try {
      localStorage.setItem(LS, t);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="theme-seg" role="group" aria-label="Theme">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          title={t.label}
          aria-label={t.label}
          aria-pressed={theme === t.id}
          className={'theme-seg__b' + (theme === t.id ? ' is-on' : '')}
          onClick={() => pick(t.id)}
        >
          <span className="theme-swatch" style={{ background: t.bg }} aria-hidden="true">
            <span className="theme-swatch__dot" style={{ background: t.accent }} />
          </span>
        </button>
      ))}
    </div>
  );
}
