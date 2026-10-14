export function getStockLevel(stock) {
  if (stock === 0) return 'out';
  if (stock <= 10) return 'low';
  return 'in';
}

// Sobre 100 unidades no se muestra la cifra exacta: "+100".
export const TOPE_VISIBLE = 100;
export const cantidadVisible = (n) => (n > TOPE_VISIBLE ? `+${TOPE_VISIBLE}` : String(n));

// Texto corto con la cantidad disponible, para tarjetas y detalle.
export function stockLabel(stock) {
  const level = getStockLevel(stock);
  if (level === 'out') return 'Agotado';
  if (level === 'low') return stock === 1 ? 'Queda 1 unidad' : `Quedan ${stock} unidades`;
  return stock > TOPE_VISIBLE ? `+${TOPE_VISIBLE} productos` : `${stock} disponibles`;
}

// Unidades de una sucursal: "Sin stock", "1 unidad", "45 unidades" o "+100 unidades".
export function unidadesLabel(n) {
  if (n <= 0) return 'Sin stock';
  if (n === 1) return '1 unidad';
  return `${cantidadVisible(n)} unidades`;
}

// El inventario informa dos cifras:
//   stock      = máximo que se puede comprar en un pedido (la sucursal con más unidades): limita el carrito.
//   stockTotal = unidades en todas las farmacias y el almacén central: es lo que ve el cliente.
// Los datos de ejemplo (sin backend) solo traen "stock".
export const stockTotal = (medicamento) => Math.max(medicamento?.stockTotal ?? 0, medicamento?.stock ?? 0);

// "Hasta 79 por pedido" cuando una sola sucursal no alcanza a entregar todo el stock total.
export function limitePorPedido(medicamento) {
  if (!medicamento || medicamento.stock <= 0) return '';
  return stockTotal(medicamento) > medicamento.stock ? `Hasta ${cantidadVisible(medicamento.stock)} por pedido` : '';
}
