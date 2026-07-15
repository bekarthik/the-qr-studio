import { Routes, Route } from 'react-router-dom';
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

export function App() {
  return (
    <Routes>
      {ROUTES.map((route) => (
        <Route key={route.path} path={route.path} element={pageFor(route)} />
      ))}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
