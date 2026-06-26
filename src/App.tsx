import { GeneratorProvider } from './state/GeneratorContext';
import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Footer } from './components/Footer';
import { SourcePicker } from './components/SourcePicker';
import { SourceForm } from './components/SourceForm';
import { ImageSection } from './components/ImageSection';
import { Settings } from './components/Settings';
import { Preview } from './components/Preview';

export function App() {
  return (
    <GeneratorProvider>
      <Nav />
      <Hero />

      <main className="app" id="app">
        {/* Content — source + details + image (grid-area: content) */}
        <section className="card card--content">
          <div className="card__head">
            <h2>Build your code</h2>
            <p>Pick a source, fill in the details, then add an image if you like.</p>
          </div>

          <h3 className="h">
            <span className="h__num">1</span> Choose a source
          </h3>
          <SourcePicker />

          <h3 className="h">
            <span className="h__num">2</span> Enter the details
          </h3>
          <SourceForm />

          <h3 className="h">
            <span className="h__num">3</span> Add an image <span className="h__opt">optional</span>
          </h3>
          <ImageSection />
        </section>

        {/* Preview (grid-area: preview, sticky) */}
        <Preview />

        {/* Style — common to every source (grid-area: style) */}
        <section className="card card--style">
          <div className="card__head">
            <h2>Style</h2>
            <p>Applies to every code you make.</p>
          </div>
          <Settings />
        </section>
      </main>

      <Footer />
    </GeneratorProvider>
  );
}
