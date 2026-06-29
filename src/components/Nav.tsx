import { SupportButton } from './Support';
import { ThemeToggle } from './ThemeToggle';

export function Nav() {
  return (
    <header className="nav">
      <div className="nav__inner">
        <a className="nav__brand" href="#top">
          <span className="nav__logo" aria-hidden="true">▣</span>
          <span className="nav__name">QR&nbsp;Studio</span>
        </a>
        <nav className="nav__links">
          <a href="#features">Features</a>
          <a href="#app">Generator</a>
          <ThemeToggle />
          <SupportButton className="nav__support">☕ Support</SupportButton>
        </nav>
      </div>
    </header>
  );
}
