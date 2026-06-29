import { useEffect, useState, type ReactNode } from 'react';

type Theme = 'linen' | 'graphite' | 'midnight';
const LS = 'qrstudio.theme';

/** Light → contrast → dark, as small monochrome marks. */
const THEMES: { id: Theme; label: string; icon: ReactNode }[] = [
  {
    id: 'linen',
    label: 'Linen (warm light)',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="3.3" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" />
        </g>
      </svg>
    ),
  },
  {
    id: 'graphite',
    label: 'Graphite (cool light)',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'midnight',
    label: 'Midnight (dark)',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M12.4 9.6A5 5 0 0 1 6.4 3.6a5 5 0 1 0 6 6z" fill="currentColor" />
      </svg>
    ),
  },
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
          {t.icon}
        </button>
      ))}
    </div>
  );
}
