// Animación "vuela al carrito": una copia de la foto del producto viaja en curva
// hasta el ícono del carrito del encabezado. Al llegar avisa con un evento para que
// el carrito rebote. Usa la Web Animations API (sin librerías).
export const EVENTO_LLEGO_AL_CARRITO = 'farmaexpress:carrito-llego';

const avisarLlegada = () => window.dispatchEvent(new Event(EVENTO_LLEGO_AL_CARRITO));

export function volarAlCarrito(origen) {
  const destino = document.querySelector('[data-cart-target]');
  const sinMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!origen || !destino || sinMovimiento || !Element.prototype.animate) {
    avisarLlegada();
    return;
  }

  const o = origen.getBoundingClientRect();
  const d = destino.getBoundingClientRect();
  const lado = Math.min(o.width, o.height, 140);

  const burbuja = document.createElement('div');
  Object.assign(burbuja.style, {
    position: 'fixed',
    left: `${o.left + (o.width - lado) / 2}px`,
    top: `${o.top + (o.height - lado) / 2}px`,
    width: `${lado}px`,
    height: `${lado}px`,
    zIndex: '1000',
    overflow: 'hidden',
    borderRadius: '20px',
    pointerEvents: 'none',
    boxShadow: '0 18px 40px -16px rgba(26, 29, 58, 0.45)',
  });
  const copia = origen.cloneNode(true);
  copia.removeAttribute('id');
  Object.assign(copia.style, { width: '100%', height: '100%', margin: '0' });
  burbuja.appendChild(copia);
  document.body.appendChild(burbuja);

  // Recorrido desde el centro del producto al centro del carrito, subiendo en arco.
  const dx = d.left + d.width / 2 - (o.left + o.width / 2);
  const dy = d.top + d.height / 2 - (o.top + o.height / 2);
  const alto = Math.min(dy, 0) * 0.35 - 90;

  const vuelo = burbuja.animate(
    [
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1, borderRadius: '20px' },
      { transform: 'translate(0, -14px) scale(1.05) rotate(-4deg)', opacity: 1, offset: 0.15 },
      { transform: `translate(${dx * 0.55}px, ${alto}px) scale(0.55) rotate(8deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.08) rotate(16deg)`, opacity: 0.4, borderRadius: '50%' },
    ],
    { duration: 850, easing: 'cubic-bezier(0.45, 0, 0.35, 1)' }
  );

  const terminar = () => {
    burbuja.remove();
    avisarLlegada();
  };
  vuelo.onfinish = terminar;
  vuelo.oncancel = terminar;
}
