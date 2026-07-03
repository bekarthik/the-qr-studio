import { Nav } from './Nav';
import { Footer } from './Footer';

export function NotFound() {
  return (
    <>
      <Nav />
      <main className="studio" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h1>Page not found</h1>
        <p>
          That page doesn't exist. <a href="/">Go back to QR Studio →</a>
        </p>
      </main>
      <Footer />
    </>
  );
}
