import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useCatalog } from './CatalogContext';
import { getCart, saveCart } from '../api/cartApi';
import CartToast from '../components/CartToast/CartToast';

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
  const { usingMock, refresh } = useCatalog();
  // Cada cuenta de Entra ID (oid) tiene su propio carrito.
  const owner = user?.id || null;
  // Con backend, el carrito se guarda en el servidor por cuenta (mismo carrito en cualquier dispositivo).
  const remote = Boolean(owner) && !usingMock;

  const [cart, setCart] = useState(() => ({ owner, items: loadLocal(owner) }));
  const lastSynced = useRef(null);
  const timer = useRef(null);
  // Panel del carrito (se abre desde el encabezado o desde el aviso "Ver carrito").
  const [abierto, setAbierto] = useState(false);
  // Aviso "Agregado al carrito" del último producto agregado.
  const [aviso, setAviso] = useState(null);
  const avisos = useRef(0);
  const abrirCarrito = useCallback(() => {
    setAviso(null);
    setAbierto(true);
  }, []);
  const cerrarCarrito = useCallback(() => setAbierto(false), []);
  const cerrarAviso = useCallback(() => setAviso(null), []);

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

  const addItem = (medicamento, cantidad = 1, { silencioso = false } = {}) => {
    const enCarrito = items.find((i) => i.id === medicamento.id)?.cantidad || 0;
    const agregadas = Math.min(cantidad, Math.max(0, medicamento.stock - enCarrito));
    if (owner && agregadas > 0 && !silencioso) {
      avisos.current += 1;
      setAviso({ key: avisos.current, nombre: medicamento.nombre, cantidad: agregadas });
    }
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

  // Antes del checkout el servidor debe tener exactamente el carrito que ve el usuario.
  const sincronizar = async () => {
    if (!remote) return;
    clearTimeout(timer.current);
    if (signature(items) !== lastSynced.current) await pushToServer(items);
  };

  // Tras un pago aprobado el BFF vacía el carrito: se vuelve a leer del servidor y se refresca el stock.
  const recargar = useCallback(async () => {
    if (!remote) return;
    const data = await getCart();
    const serverItems = fromServer(data.items);
    lastSynced.current = signature(serverItems);
    setCart((c) => (c.owner === owner ? { owner, items: serverItems } : c));
    await refresh();
  }, [remote, owner, refresh]);

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
        sincronizar,
        recargar,
        conBackend: remote,
        total,
        count,
        canUseCart: Boolean(owner),
        abierto,
        abrirCarrito,
        cerrarCarrito,
      }}
    >
      {children}
      <CartToast aviso={abierto ? null : aviso} onVerCarrito={abrirCarrito} onCerrar={cerrarAviso} />
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
}
