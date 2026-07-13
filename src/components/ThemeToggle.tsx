import { useEffect, useState } from 'react';

const LS = 'qrstudio.theme';

/** A single light ⇄ dark toggle. Dark maps to the app's "midnight" theme key,
 *  so the pre-paint script in index.html (which looks for 'midnight') applies
 *  it before first paint with no flash. */
function apply(dark: boolean) {
  if (dark) document.documentElement.dataset.theme = 'midnight';
  else delete document.documentElement.dataset.theme;
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    let d = false;
    try {
      d = localStorage.getItem(LS) === 'midnight';
    } catch {
      /* ignore */
    }
    apply(d);
    setDark(d);
  }, []);

  const toggle = () => {
    const d = !dark;
    setDark(d);
    apply(d);
    try {
      localStorage.setItem(LS, d ? 'midnight' : 'linen');
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      className="chip-btn"
      onClick={toggle}
      aria-pressed={dark}
      title="Toggle light / dark"
    >
      {dark ? '☀ Light' : '☾ Dark'}
    </button>
  );
}
