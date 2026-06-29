import { createRoot } from 'react-dom/client';
import './style.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);

// Offline support: register the service worker in production builds only
// (dev relies on Vite HMR). Uses a relative URL so it works from a sub-path.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support is a progressive enhancement — ignore failures */
    });
  });
}
