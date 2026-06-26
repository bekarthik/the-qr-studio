export function Footer() {
  return (
    <footer className="foot">
      <div className="foot__inner">
        <div className="foot__top">
          <span className="foot__brand">
            <span className="nav__logo" aria-hidden="true">▣</span> QR Studio
          </span>
          <a href="https://github.com/bekarthik/chores" target="_blank" rel="noopener">
            Source
          </a>
        </div>
        <p>
          Runs entirely in your browser — no accounts, no tracking, no uploads. You're responsible
          for where your codes lead; don't create QR codes for phishing, scams or anything you
          wouldn't put your name to.
        </p>
      </div>
    </footer>
  );
}
