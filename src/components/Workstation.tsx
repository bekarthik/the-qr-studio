import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useGen } from '../state/GeneratorContext';
import { StudioSource } from './StudioSource';
import { StudioStyle } from './StudioStyle';
import { StudioCard } from './StudioCard';
import { Preview, type BadgeState, type ExportApi } from './Preview';
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

const ZOOMS = [50, 75, 100, 125, 150] as const;

/**
 * The full generator, laid out as the three-pane "workstation" from the design:
 * source setup (left), the live canvas (centre), and colour / modules / verify
 * (right), over a top bar and a status bar.
 *
 * Chrome owns the document-level actions — Share, Reset, and Export (the
 * previews register their download functions via `registerExport`) — so the
 * canvas holds only the artwork, like a real editor. A zoom control scales the
 * stage via a CSS variable.
 *
 * The full-window overlay is rendered through a portal on <body> so its
 * `position: fixed` escapes the page's stacking contexts and reliably covers
 * everything, including the sticky nav.
 */
export function Workstation() {
  const { cfg } = useGen();
  const [output, setOutput] = useState<OutputMode>('qr');
  const [full, setFull] = useState(false);
  const [status, setStatus] = useState<BadgeState>('hidden');
  const [zoom, setZoom] = useState(100);
  const [exportApi, setExportApi] = useState<ExportApi | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Stable registrar so the previews' effects don't re-fire on every render.
  const registerExport = useCallback((api: ExportApi) => setExportApi(api), []);

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

  // Close the Export menu on any outside press.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const isCard = output === 'card';
  const ecc = cfg.resemble || cfg.embed ? 'H' : cfg.errorLevel;
  const chip = isCard ? { cls: ' ws-vchip--wait', label: 'Card mode' } : CHIP[status];
  const canExport = Boolean(exportApi?.ready);

  const switchOutput = (mode: OutputMode) => {
    setOutput(mode);
    setExportApi(null); // the mounted preview re-registers its own exporters
  };

  const runExport = (kind: 'png' | 'svg') => {
    if (!exportApi?.ready) return;
    (kind === 'png' ? exportApi.png : exportApi.svg)();
    setMenuOpen(false);
  };

  const zoomBy = (dir: -1 | 1) => {
    setZoom((z) => {
      const i = ZOOMS.indexOf(z as (typeof ZOOMS)[number]);
      return ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, i + dir))];
    });
  };

  const windowEl = (
    <div className={'ws-window' + (full ? ' is-full' : '')} id="app">
      <div className="ws-bar">
        <span className="ws-mark" aria-hidden="true">
          <span />
        </span>
        <span className="ws-file">
          <span className="ws-file__dot" /> {cfg.type}.qr
        </span>
        <span className={'ws-vchip' + chip.cls}>
          <span className="t" />
          {chip.label}
        </span>
        <div className="ws-bar__actions">
          <ShareButton />
          <ResetButton />
          <div className="ws-export" ref={menuRef}>
            <button
              type="button"
              className="ws-exp"
              disabled={!canExport}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title={canExport ? 'Download the artwork' : 'Fill in the source details first'}
              onClick={() => setMenuOpen((o) => !o)}
            >
              Export ▾
            </button>
            {menuOpen && (
              <div className="ws-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => runExport('png')}>
                  PNG <span>{isCard ? 'print-ready raster' : '1600 px raster'}</span>
                </button>
                <button type="button" role="menuitem" onClick={() => runExport('svg')}>
                  SVG <span>vector, any size</span>
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className="ws-full-btn"
            onClick={() => setFull((f) => !f)}
            title={full ? 'Return to the page' : 'Expand to the full browser window'}
          >
            {full ? '✕ Close studio' : '⤢ Open studio'}
          </button>
        </div>
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
                onClick={() => switchOutput('qr')}
              >
                QR code
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isCard}
                className={isCard ? 'on' : ''}
                onClick={() => switchOutput('card')}
              >
                Visiting card
              </button>
            </div>
            <div className="ws-zoom" role="group" aria-label="Zoom">
              <button type="button" disabled={zoom === ZOOMS[0]} onClick={() => zoomBy(-1)} aria-label="Zoom out">
                −
              </button>
              <span>{zoom}%</span>
              <button
                type="button"
                disabled={zoom === ZOOMS[ZOOMS.length - 1]}
                onClick={() => zoomBy(1)}
                aria-label="Zoom in"
              >
                +
              </button>
            </div>
          </div>
          <div className="ws-stage" style={{ '--zoom': zoom / 100 } as CSSProperties}>
            {isCard ? (
              <CardPreview registerExport={registerExport} />
            ) : (
              <Preview onStatus={setStatus} registerExport={registerExport} />
            )}
          </div>
        </main>

        <aside className="ws-pane ws-pane--r">{isCard ? <StudioCard /> : <StudioStyle />}</aside>
      </div>

      <div className="ws-status">
        <span
          className="ws-status__dot"
          style={{ background: status === 'fail' && !isCard ? 'var(--bad)' : 'var(--ok)' }}
        />
        <span style={{ color: status === 'fail' && !isCard ? 'var(--bad)' : 'var(--ok)', fontWeight: 600 }}>
          {isCard ? 'Visiting card' : status === 'fail' ? 'Not scannable' : status === 'checking' ? 'Checking…' : 'Scanner-verified'}
        </span>
        <span className="ws-status__spec">
          ECC {ecc} · decoded in-browser{isCard ? '' : ' · PNG 1600 px · SVG vector'}
        </span>
      </div>
    </div>
  );

  return full ? createPortal(windowEl, document.body) : windowEl;
}
