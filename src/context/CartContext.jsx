import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useCatalog } from './CatalogContext';
import { getCart, saveCart, createOrder } from '../api/cartApi';

const CartContext = createContext(null);
const CART_PREFIX = 'farmaexpress_cart_';
const SYNC_DELAY = 400;

// Copia local del carrito de cada cuenta (respaldo si no hay conexión con el backend).
const cartKey = (cuenta) => `${CART_PREFIX}${cuenta.toLowerCase()}`;

function loadLocal(cuenta) {
  if (!cuenta) return [];
  try {
    return JSON.parse(localStorage.getItem(cartKey(cuenta))) || [];
  } catch {
    return [];
  }
}

// Lo que importa comparar con el servidor: qué productos y cuántos.
const signature = (items) => JSON.stringify(items.map(({ id, cantidad }) => [id, cantidad]));

const fromServer = (items) => items.map(({ id, nombre, precio, cantidad }) => ({ id, nombre, precio, cantidad }));

// El carrito global de versiones anteriores no pertenece a ninguna cuenta: se descarta.
localStorage.removeItem('farmaexpress_cart');

export function CartProvider({ children }) {
  const { user } = useAuth();
  const { usingMock, purchaseMock, refresh } = useCatalog();
  // Cada cuenta de Entra ID (oid) tiene su propio carrito.
  const owner = user?.id || null;
  // Con backend, el carrito se guarda en el servidor por cuenta (mismo carrito en cualquier dispositivo).
  const remote = Boolean(owner) && !usingMock;

  const [cart, setCart] = useState(() => ({ owner, items: loadLocal(owner) }));
  const lastSynced = useRef(null);
  const timer = useRef(null);

  // Al iniciar o cerrar sesión (o cambiar de cuenta) se carga el carrito de esa cuenta.
  if (cart.owner !== owner) {
    setCart({ owner, items: loadLocal(owner) });
  }
  const items = cart.owner === owner ? cart.items : [];

  // Trae el carrito guardado en el servidor.
  useEffect(() => {
    if (!remote) return undefined;
    let cancelled = false;
    lastSynced.current = null;
    getCart()
      .then((data) => {
        if (cancelled) return;
        const serverItems = fromServer(data.items);
        lastSynced.current = signature(serverItems);
        setCart((c) => (c.owner === owner ? { owner, items: serverItems } : c));
      })
      .catch(() => {
        // Si falla, se sigue con la copia local.
      });
    return () => {
      cancelled = true;
    };
  }, [remote, owner]);

  const pushToServer = useCallback(
    async (current) => {
      const data = await saveCart(current);
      const serverItems = fromServer(data.items);
      lastSynced.current = signature(serverItems);
      // El servidor pudo ajustar cantidades al stock o quitar productos agotados.
      if (signature(serverItems) !== signature(current)) {
        setCart((c) => (c.owner === owner ? { owner, items: serverItems } : c));
      }
    },
    [owner]
  );

  // Guarda cada cambio: en el navegador al instante y en el servidor con una pequeña espera.
  useEffect(() => {
    if (!cart.owner || cart.owner !== owner) return undefined;
    localStorage.setItem(cartKey(cart.owner), JSON.stringify(cart.items));
    if (!remote || lastSynced.current === null || signature(cart.items) === lastSynced.current) {
      return undefined;
    }
    timer.current = setTimeout(() => {
      timer.current = null;
      pushToServer(cart.items).catch(() => {});
    }, SYNC_DELAY);
    return () => clearTimeout(timer.current);
  }, [cart, owner, remote, pushToServer]);

  const setItems = (updater) => {
    if (!owner) return;
    setCart((prev) => ({ owner: prev.owner, items: updater(prev.items) }));
  };

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

  const clearCart = () => setItems(() => []);

  // Compra lo que hay en el carrito. Con backend, el BFF descuenta el stock y registra el pedido.
  const checkout = async () => {
    if (!owner || items.length === 0) return null;
    if (!remote) {
      purchaseMock(items.map((i) => ({ id: i.id, cantidad: i.cantidad })));
      clearCart();
      return null;
    }
    // Antes de comprar, el servidor debe tener el carrito exacto que ve el usuario.
    clearTimeout(timer.current);
    if (signature(items) !== lastSynced.current) await pushToServer(items);
    const pedido = await createOrder();
    lastSynced.current = signature([]);
    setCart((c) => ({ ...c, items: [] }));
    await refresh();
    return pedido;
  };

  const total = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const count = items.reduce((sum, i) => sum + i.cantidad, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        checkout,
        total,
        count,
        canUseCart: Boolean(owner),
      }}
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
