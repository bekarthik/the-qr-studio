import { Routes, Route } from 'react-router-dom';
import { ROUTES } from './seo/routes';
import { ToolPage } from './components/ToolPage';
import { NotFound } from './components/NotFound';

export function App() {
  return (
    <Routes>
      {ROUTES.map((route) => (
        <Route key={route.path} path={route.path} element={<ToolPage route={route} />} />
      ))}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
