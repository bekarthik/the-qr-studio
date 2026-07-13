import { SupportButton } from './Support';
import { ThemeToggle } from './ThemeToggle';
import { Brand } from './Brand';
import { OPEN_STUDIO_EVENT } from './Workstation';

const openStudio = () => window.dispatchEvent(new CustomEvent(OPEN_STUDIO_EVENT));

export function Nav() {
  return (
    <header className="nav">
      <div className="wrap nav__in">
        <Brand />
        <nav className="nav__links" aria-label="Primary">
          <a href="#studio">Generator</a>
          <a href="#print">Survives print</a>
          <a href="#features">Privacy</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="nav__tools">
          <ThemeToggle />
          <SupportButton className="chip-btn">☕ Support</SupportButton>
          <button type="button" className="btn btn--sm" onClick={openStudio}>
            Open studio ▸
          </button>
        </div>
      </div>
    </header>
  );
}
