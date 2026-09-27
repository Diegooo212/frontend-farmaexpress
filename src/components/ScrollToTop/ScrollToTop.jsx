import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Al cambiar de página, la nueva empieza desde arriba. Si el enlace lleva a una sección
// (p. ej. /#recetas), la página se encarga de bajar hasta ella.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (hash) return;
    // "instant" evita la animación de scroll suave definida en el CSS global.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);

  return null;
}
