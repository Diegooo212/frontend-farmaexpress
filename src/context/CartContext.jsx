import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);
const CART_KEY = 'farmaexpress_cart';

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (medicamento, cantidad = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === medicamento.id);
      const currentQty = existing ? existing.cantidad : 0;
      const maxAddable = Math.max(0, medicamento.stock - currentQty);
      const cantidadFinal = Math.min(cantidad, maxAddable);

      if (cantidadFinal <= 0) return prev;

      if (existing) {
        return prev.map((i) =>
          i.id === medicamento.id ? { ...i, cantidad: i.cantidad + cantidadFinal } : i
        );
      }
      return [
        ...prev,
        {
          id: medicamento.id,
          nombre: medicamento.nombre,
          precio: medicamento.precio,
          cantidad: cantidadFinal,
        },
      ];
    });
  };

  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id));

  const updateQty = (id, cantidad, maxStock = Infinity) => {
    if (cantidad <= 0) {
      removeItem(id);
      return;
    }
    const cantidadFinal = Math.min(cantidad, maxStock);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, cantidad: cantidadFinal } : i)));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const count = items.reduce((sum, i) => sum + i.cantidad, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQty, clearCart, total, count }}
    >
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
}