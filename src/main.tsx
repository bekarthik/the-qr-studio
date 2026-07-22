import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './style.css';
import { App } from './App';
import { initAnalytics } from './lib/analytics';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);

// Cloudflare Web Analytics (prod + configured token + real visitors only).
initAnalytics();

// Offline support: register the service worker in production builds only
// (dev relies on Vite HMR). Absolute path so it registers from any route
// (e.g. /upi/), matching the root scope it caches for.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline support is a progressive enhancement — ignore failures */
    });
  });
}
