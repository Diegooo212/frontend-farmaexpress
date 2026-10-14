import httpClient from './httpClient';

const BASE = '/api/bff/payments';

// [{ codigo, nombre, descripcion, modo, disponible, circuito }]: "disponible" sale del circuit breaker.
export const getMetodosPago = () => httpClient.get(`${BASE}/metodos`).then((res) => res.data);

// Solo Administrador: simula la caída de un proveedor para demostrar el circuit breaker.
export const simularCaida = (metodo, caido) =>
  httpClient.post(`${BASE}/simulacion`, { metodo, caido }).then((res) => res.data);

/**
 * Envía el navegador al proveedor. Webpay exige un formulario POST con token_ws;
 * Mercado Pago, Khipu y el simulador usan una redirección normal.
 */
export function irAlProveedor(redireccion) {
  if (redireccion.metodo === 'POST') {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = redireccion.url;
    Object.entries(redireccion.campos || {}).forEach(([nombre, valor]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = nombre;
      input.value = valor;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
    return;
  }
  window.location.assign(redireccion.url);
}
