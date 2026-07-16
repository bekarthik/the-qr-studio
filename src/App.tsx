import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ROUTES } from './seo/routes';
import { ToolPage } from './components/ToolPage';
import { ContactPage } from './components/ContactPage';
import { LegalPage } from './components/LegalPage';
import { NotFound } from './components/NotFound';

function pageFor(route: (typeof ROUTES)[number]) {
  if (route.pageType === 'legal') return <LegalPage route={route} />;
  if (route.pageType === 'page') return <ContactPage route={route} />;
  return <ToolPage route={route} />;
}

/**
 * React Router keeps the previous scroll position across client-side
 * navigations, so moving between pages (e.g. /terms ⇄ /privacy) would leave you
 * mid-page. Reset to the top on every path change — but when the target has a
 * hash, scroll to that element instead so in-page anchors still land right.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);
  return null;
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {ROUTES.map((route) => (
          <Route key={route.path} path={route.path} element={pageFor(route)} />
        ))}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
