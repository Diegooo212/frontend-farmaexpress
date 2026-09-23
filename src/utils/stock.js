export function getStockLevel(stock) {
  if (stock === 0) return 'out';
  if (stock <= 10) return 'low';
  return 'in';
}

// Texto corto con la cantidad disponible, para tarjetas y detalle.
export function stockLabel(stock) {
  const level = getStockLevel(stock);
  if (level === 'out') return 'Agotado';
  if (level === 'low') return stock === 1 ? 'Queda 1 unidad' : `Quedan ${stock} unidades`;
  return `${stock} disponibles`;
}
