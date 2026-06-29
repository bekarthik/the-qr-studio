import { useState } from 'react';
import { GeneratorProvider } from './state/GeneratorContext';
import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Footer } from './components/Footer';
import { SourcePicker } from './components/SourcePicker';
import { SourceForm } from './components/SourceForm';
import { ImageSection } from './components/ImageSection';
import { Settings } from './components/Settings';
import { Preview } from './components/Preview';
import { CardControls } from './components/CardControls';
import { CardPreview } from './components/CardPreview';
import { Features } from './components/Features';
import { ResetButton } from './components/ResetButton';
import { ShareButton } from './components/ShareButton';

type OutputMode = 'qr' | 'card';
type ControlsTab = 'setup' | 'style' | 'card';

const TABS: { id: ControlsTab; label: string; badge?: string }[] = [
  { id: 'setup', label: 'Setup', badge: '1·3' },
  { id: 'style', label: 'Style' },
  { id: 'card', label: 'Card' },
];

export function App() {
  // Independent controls: which controls are shown (tab) is separate from what
  // the preview shows (output). Tabs swap controls; the output switch swaps the
  // live result — so you can edit the card while previewing the QR, and back.
  const [tab, setTab] = useState<ControlsTab>('setup');
  const [output, setOutput] = useState<OutputMode>('qr');

  return (
    <GeneratorProvider>
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
                  onClick={() => setTab(t.id)}
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

      <Features />
      <Footer />
    </GeneratorProvider>
  );
}
