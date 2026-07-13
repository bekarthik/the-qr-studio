import { Routes, Route } from 'react-router-dom';
import { ROUTES } from './seo/routes';
import { ToolPage } from './components/ToolPage';
import { ContactPage } from './components/ContactPage';
import { NotFound } from './components/NotFound';

export function App() {
  return (
    <Routes>
      {ROUTES.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={route.pageType === 'page' ? <ContactPage route={route} /> : <ToolPage route={route} />}
        />
      ))}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
