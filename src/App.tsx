import { useEffect, useState } from 'react';
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

const BASE_SECTIONS = [
  { id: 'step-source', label: 'Source' },
  { id: 'step-details', label: 'Details' },
  { id: 'step-image', label: 'Image' },
  { id: 'step-style', label: 'Style' },
];

export function App() {
  const [output, setOutput] = useState<OutputMode>('qr');
  const [active, setActive] = useState('step-source');

  const sections = output === 'card' ? [...BASE_SECTIONS, { id: 'step-card', label: 'Card' }] : BASE_SECTIONS;

  // Scroll-spy: highlight the section nearest the top of the viewport.
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => e != null);
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) {
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: '-118px 0px -55% 0px', threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [output]); // eslint-disable-line react-hooks/exhaustive-deps

  const jump = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pickCard = () => {
    setOutput('card');
    // let the card section mount, then bring it into view
    window.setTimeout(() => jump('step-card'), 60);
  };

  const pills = (extra: string) => (
    <nav className={'section-nav' + extra} aria-label="Jump to section">
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          aria-current={active === s.id}
          className={'section-nav__b' + (active === s.id ? ' is-on' : '')}
          onClick={() => jump(s.id)}
        >
          {s.label}
        </button>
      ))}
    </nav>
  );

  return (
    <GeneratorProvider>
      <Nav />
      <Hero />

      <main className="studio" id="app">
        {/* Controls — one continuous flow with a sticky section jump-nav */}
        <div className="studio__controls">
          {pills('')}

          <section className="card panel">
            <div className="card__head card__head--row">
              <div>
                <h2>Create your code</h2>
                <p>Pick a source, fill it in, add an image, then style it — the preview updates live.</p>
              </div>
              <div className="head-actions">
                <ShareButton />
                <ResetButton />
              </div>
            </div>

            <div className="panel__step" id="step-source">
              <h3 className="h"><span className="h__num">1</span> Choose a source</h3>
              <SourcePicker />
            </div>
            <div className="panel__step" id="step-details">
              <h3 className="h"><span className="h__num">2</span> Enter the details</h3>
              <SourceForm />
            </div>
            <div className="panel__step" id="step-image">
              <h3 className="h"><span className="h__num">3</span> Add an image <span className="h__opt">optional</span></h3>
              <ImageSection />
            </div>
            <div className="panel__step" id="step-style">
              <h3 className="h"><span className="h__num">4</span> Style</h3>
              <Settings />
            </div>

            {output === 'card' && (
              <div className="panel__step panel__step--card" id="step-card">
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
                  onClick={pickCard}
                >
                  Visiting card
                </button>
              </div>
              <p className="output-card__hint">Live · verified in-browser</p>
            </div>
            {pills(' section-nav--mobile')}
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
