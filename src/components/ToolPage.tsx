import { useEffect, useMemo, useState } from 'react';
import type { RouteDef } from '../seo/routes';
import { applyRouteHead } from '../seo/head';
import { buildJsonLd } from '../seo/jsonld';
import { GeneratorProvider } from '../state/GeneratorContext';
import { Nav } from './Nav';
import { Hero } from './Hero';
import { Footer } from './Footer';
import { SourcePicker } from './SourcePicker';
import { SourceForm } from './SourceForm';
import { ImageSection } from './ImageSection';
import { Settings } from './Settings';
import { Preview } from './Preview';
import { CardControls } from './CardControls';
import { CardPreview } from './CardPreview';
import { Features } from './Features';
import { ResetButton } from './ResetButton';
import { ShareButton } from './ShareButton';
import { JsonLd } from './JsonLd';
import { ContentBlocks } from './ContentBlocks';

type OutputMode = 'qr' | 'card';
type ControlsTab = 'setup' | 'style' | 'card';

const TABS: { id: ControlsTab; label: string; badge?: string }[] = [
  { id: 'setup', label: 'Setup', badge: '1·3' },
  { id: 'style', label: 'Style' },
  { id: 'card', label: 'Card' },
];

/**
 * The same interactive tool rendered at every route, initialised to that
 * route's preset source type. Human UX is byte-identical to the single-page
 * app this replaced — only the initial source and the surrounding static SEO
 * content (wired in later steps) differ per route.
 */
export function ToolPage({ route }: { route: RouteDef }) {
  const [tab, setTab] = useState<ControlsTab>('setup');
  const [output, setOutput] = useState<OutputMode>('qr');

  useEffect(() => applyRouteHead(route), [route]);
  const jsonLd = useMemo(() => buildJsonLd(route), [route]);

  // Opening the Card tab flips the preview to the card so the design you're
  // editing is what you see; the output switch still lets you go back to the QR.
  const selectTab = (id: ControlsTab) => {
    setTab(id);
    if (id === 'card') setOutput('card');
  };

  return (
    <GeneratorProvider preset={route.preset}>
      <JsonLd data={jsonLd} />
      <Nav />
      <Hero />

      <main className="studio" id="app">
        {/* Controls — tabbed so each panel is short and the preview stays beside */}
        <div className="studio__controls">
          <section className="card panel">
            <div className="card__head card__head--row">
              <div>
                <h2>Create your code</h2>
                <p>Set up your source, style the code, or design a card — the preview updates live.</p>
              </div>
              <div className="head-actions">
                <ShareButton />
                <ResetButton />
              </div>
            </div>

            <div className="ctabs" role="tablist" aria-label="Controls">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={'ctab' + (tab === t.id ? ' is-on' : '')}
                  onClick={() => selectTab(t.id)}
                >
                  {t.badge && <span className="ctab__n">{t.badge}</span>}
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'setup' && (
              <div className="ctab-panel">
                <div className="panel__step">
                  <h3 className="h"><span className="h__num">1</span> Choose a source</h3>
                  <SourcePicker />
                </div>
                <div className="panel__step">
                  <h3 className="h"><span className="h__num">2</span> Enter the details</h3>
                  <SourceForm />
                </div>
                <div className="panel__step">
                  <h3 className="h"><span className="h__num">3</span> Add an image <span className="h__opt">optional</span></h3>
                  <ImageSection />
                </div>
              </div>
            )}

            {tab === 'style' && (
              <div className="ctab-panel">
                <Settings />
              </div>
            )}

            {tab === 'card' && (
              <div className="ctab-panel">
                <CardControls />
              </div>
            )}
          </section>
        </div>

        {/* Output — the live result, independently switchable QR ⇄ card */}
        <aside className="studio__output">
          <section className="card output-card">
            <div className="output-card__bar">
              <div className="seg output-switch" role="tablist" aria-label="Preview">
                <button
                  type="button"
                  role="tab"
                  aria-selected={output === 'qr'}
                  className={'seg__b' + (output === 'qr' ? ' is-on' : '')}
                  onClick={() => setOutput('qr')}
                >
                  QR code
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={output === 'card'}
                  className={'seg__b' + (output === 'card' ? ' is-on' : '')}
                  onClick={() => setOutput('card')}
                >
                  Visiting card
                </button>
              </div>
              <p className="output-card__hint">Live · verified in-browser</p>
            </div>
            <div className="output-card__body">
              {output === 'qr' ? <Preview /> : <CardPreview />}
            </div>
          </section>
        </aside>
      </main>

      <ContentBlocks blocks={route.content} />
      <Features />
      <Footer />
    </GeneratorProvider>
  );
}
