import { useEffect } from 'react';

// Hace aparecer suavemente los bloques con la clase "reveal" cuando entran en pantalla.
// También detecta bloques que se agregan después (por ejemplo, cuando llegan los datos).
export default function useReveal(contenedorRef) {
  useEffect(() => {
    const raiz = contenedorRef.current;
    if (!raiz) return undefined;

    if (!('IntersectionObserver' in window)) {
      raiz.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
      return undefined;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            observador.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    const observar = () =>
      raiz.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => observador.observe(el));
    observar();

    const mutaciones = new MutationObserver(observar);
    mutaciones.observe(raiz, { childList: true, subtree: true });

    return () => {
      observador.disconnect();
      mutaciones.disconnect();
    };
  }, [contenedorRef]);
}
