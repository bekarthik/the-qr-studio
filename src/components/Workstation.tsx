import { useEffect, useState } from 'react';
import { SourcePicker } from './SourcePicker';
import { SourceForm } from './SourceForm';
import { ImageSection } from './ImageSection';
import { Settings } from './Settings';
import { Preview } from './Preview';
import { CardControls } from './CardControls';
import { CardPreview } from './CardPreview';
import { ShareButton } from './ShareButton';
import { ResetButton } from './ResetButton';

type OutputMode = 'qr' | 'card';

/** Fired by the nav / hero "Open studio" affordances; the Workstation listens
 *  for it so those buttons stay decoupled from this component's state. */
export const OPEN_STUDIO_EVENT = 'qr:open-studio';

/**
 * The full generator, laid out as a three-pane "workstation": source setup on
 * the left, the live canvas in the middle, and style / card design on the right.
 * It embeds on the landing page and expands to a full-window overlay via
 * "Open studio" (a plain CSS `position:fixed` cover — not the Fullscreen API).
 *
 * Each pane is an independent seam: new tools drop into a pane (or a new one)
 * without touching the others, so the studio can grow feature-by-feature.
 */
export function Workstation() {
  const [output, setOutput] = useState<OutputMode>('qr');
  const [full, setFull] = useState(false);

  // Lock body scroll while the overlay is open.
  useEffect(() => {
    document.body.classList.toggle('ws-open', full);
    return () => document.body.classList.remove('ws-open');
  }, [full]);

  // Open on the shared event (nav / hero); Esc closes the overlay.
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

  return (
    <section className="ws" id="app">
      <div className={'ws-window' + (full ? ' is-full' : '')}>
        <div className="ws-bar">
          <span className="ws-mark" aria-hidden="true">
            <span />
          </span>
          <span className="ws-file">
            <span className="ws-file__dot" /> untitled.qr — {isCard ? 'visiting card' : 'QR code'}
          </span>
          <div className="ws-bar__actions">
            <ShareButton />
            <ResetButton />
            <button
              type="button"
              className="ws-open-btn"
              onClick={() => setFull((f) => !f)}
              title={full ? 'Return to the page' : 'Expand to the full browser window'}
            >
              {full ? '✕ Close studio' : '⤢ Open studio'}
            </button>
          </div>
        </div>

        <div className="ws-body">
          {/* left — what the code is */}
          <aside className="ws-pane ws-pane--l">
            <div className="ws-sec">
              <h4 className="ws-sec__h">Source</h4>
              <SourcePicker />
            </div>
            <div className="ws-sec">
              <h4 className="ws-sec__h">Details</h4>
              <SourceForm />
            </div>
            <div className="ws-sec">
              <h4 className="ws-sec__h">
                Image <span className="ws-sec__opt">optional</span>
              </h4>
              <ImageSection />
            </div>
          </aside>

          {/* centre — the live result */}
          <div className="ws-canvas">
            <div className="ws-cbar">
              <div className="seg ws-output" role="tablist" aria-label="Output">
                <button
                  type="button"
                  role="tab"
                  aria-selected={!isCard}
                  className={'seg__b' + (!isCard ? ' is-on' : '')}
                  onClick={() => setOutput('qr')}
                >
                  QR code
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isCard}
                  className={'seg__b' + (isCard ? ' is-on' : '')}
                  onClick={() => setOutput('card')}
                >
                  Visiting card
                </button>
              </div>
              <span className="ws-live">Live · verified in-browser</span>
            </div>
            <div className="ws-stage">{isCard ? <CardPreview /> : <Preview />}</div>
          </div>

          {/* right — how it looks */}
          <aside className="ws-pane ws-pane--r">
            <div className="ws-sec">
              <h4 className="ws-sec__h">{isCard ? 'Card design' : 'Style'}</h4>
              {isCard ? <CardControls /> : <Settings />}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
