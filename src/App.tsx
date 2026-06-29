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

type OutputMode = 'qr' | 'card';

export function App() {
  const [output, setOutput] = useState<OutputMode>('qr');

  return (
    <GeneratorProvider>
      <Nav />
      <Hero />

      <main className="studio" id="app">
        {/* Controls — one continuous flow: source → details → image → style → card */}
        <div className="studio__controls">
          <section className="card panel">
            <div className="card__head">
              <h2>Create your code</h2>
              <p>Pick a source, fill it in, add an image, then style it — the preview updates live.</p>
            </div>

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
            <div className="panel__step">
              <h3 className="h"><span className="h__num">4</span> Style</h3>
              <Settings />
            </div>

            {output === 'card' && (
              <div className="panel__step panel__step--card">
                <h3 className="h"><span className="h__ico" aria-hidden="true">🪪</span> Visiting-card design</h3>
                <CardControls />
              </div>
            )}
          </section>
        </div>

        {/* Output — the live result, switchable between QR and visiting card */}
        <aside className="studio__output">
          <section className="card output-card">
            <div className="output-card__bar">
              <div className="seg output-switch" role="tablist" aria-label="Output">
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

      <Footer />
    </GeneratorProvider>
  );
}
