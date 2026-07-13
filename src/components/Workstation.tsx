import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { StudioSource } from './StudioSource';
import { StudioStyle } from './StudioStyle';
import { Preview, type BadgeState } from './Preview';
import { CardControls } from './CardControls';
import { CardPreview } from './CardPreview';
import { ShareButton } from './ShareButton';
import { ResetButton } from './ResetButton';

type OutputMode = 'qr' | 'card';

/** Fired by the nav / hero "Open studio" affordances; the Workstation listens
 *  for it so those buttons stay decoupled from this component's state. */
export const OPEN_STUDIO_EVENT = 'qr:open-studio';

const CHIP: Record<BadgeState, { cls: string; label: string }> = {
  ok: { cls: '', label: 'Verified · scans' },
  checking: { cls: ' ws-vchip--wait', label: 'Checking…' },
  fail: { cls: ' ws-vchip--fail', label: "Won't scan" },
  hidden: { cls: ' ws-vchip--wait', label: 'Ready' },
};

/**
 * The full generator, laid out as the three-pane "workstation" from the design:
 * source setup (left), the live canvas (centre), and colour / modules / verify
 * (right), over a top bar and a status bar. It embeds on the landing page and
 * expands to a full-window overlay via "Open studio".
 *
 * The overlay is rendered through a portal on <body> so its `position: fixed`
 * escapes the page's stacking contexts (the section .wrap has its own z-index)
 * and reliably covers everything, including the sticky nav.
 */
export function Workstation() {
  const [output, setOutput] = useState<OutputMode>('qr');
  const [full, setFull] = useState(false);
  const [status, setStatus] = useState<BadgeState>('hidden');

  useEffect(() => {
    document.body.classList.toggle('ws-open', full);
    return () => document.body.classList.remove('ws-open');
  }, [full]);

  useEffect(() => {
    const open = () => {
      document.getElementById('app')?.scrollIntoView();
      setFull(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFull(false);
    };
    window.addEventListener(OPEN_STUDIO_EVENT, open);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener(OPEN_STUDIO_EVENT, open);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const isCard = output === 'card';
  const chip = CHIP[status];

  const windowEl = (
    <div className={'ws-window' + (full ? ' is-full' : '')} id="app">
      <div className="ws-bar">
        <span className="ws-mark" aria-hidden="true">
          <span />
        </span>
        <span className="ws-file">
          <span className="ws-file__dot" /> untitled.qr — edited
        </span>
        <span className={'ws-vchip' + chip.cls}>
          <span className="t" />
          {chip.label}
        </span>
        <button
          type="button"
          className="ws-exp"
          onClick={() => setFull((f) => !f)}
          title={full ? 'Return to the page' : 'Expand to the full browser window'}
        >
          {full ? '✕ Close studio' : '⤢ Open studio'}
        </button>
      </div>

      <div className="ws-body">
        <aside className="ws-pane ws-pane--l">
          <StudioSource />
        </aside>

        <main className="ws-canvas">
          <div className="ws-cbar">
            <div className="ws-tabs" role="tablist" aria-label="Output">
              <button
                type="button"
                role="tab"
                aria-selected={!isCard}
                className={!isCard ? 'on' : ''}
                onClick={() => setOutput('qr')}
              >
                QR code
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isCard}
                className={isCard ? 'on' : ''}
                onClick={() => setOutput('card')}
              >
                Visiting card
              </button>
            </div>
            <span className="ws-zoom">Live preview</span>
          </div>
          <div className="ws-stage">{isCard ? <CardPreview /> : <Preview onStatus={setStatus} />}</div>
        </main>

        <aside className="ws-pane ws-pane--r">
          {isCard ? (
            <div className="ws-sec">
              <h4 className="ws-sec__h">Card design</h4>
              <CardControls />
            </div>
          ) : (
            <StudioStyle />
          )}
        </aside>
      </div>

      <div className="ws-status">
        <span className="ws-status__dot" />
        <span style={{ color: 'var(--ok)', fontWeight: 600 }}>
          {status === 'fail' ? 'Not scannable' : status === 'checking' ? 'Checking…' : 'Scanner-verified'}
        </span>
        <span className="ws-status__spec">ECC {isCard ? 'H' : ''} · decoded in-browser</span>
        <span className="ws-status__actions">
          <ShareButton />
          <ResetButton />
        </span>
      </div>
    </div>
  );

  return full ? createPortal(windowEl, document.body) : windowEl;
}
