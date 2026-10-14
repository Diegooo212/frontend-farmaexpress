import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useCatalog } from './CatalogContext';
import { agregarFavorito, getFavoritos, quitarFavorito } from '../api/accountApi';

const FavoritesContext = createContext(null);
const PREFIJO = 'farmaexpress_favoritos_';

// Sin backend (datos de ejemplo) los favoritos quedan en el navegador.
function cargarLocal(cuenta) {
  if (!cuenta) return [];
  try {
    return JSON.parse(localStorage.getItem(PREFIJO + cuenta.toLowerCase())) || [];
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const { usingMock } = useCatalog();
  const owner = user?.id || null;
  const remoto = Boolean(owner) && !usingMock;

  // Ids de productos favoritos de la cuenta actual (más recientes primero).
  const [estado, setEstado] = useState(() => ({ owner, ids: cargarLocal(owner) }));
  if (estado.owner !== owner) {
    setEstado({ owner, ids: cargarLocal(owner) });
  }
  const ids = estado.owner === owner ? estado.ids : [];

  useEffect(() => {
    if (!remoto) return undefined;
    let cancelado = false;
    getFavoritos()
      .then((lista) => !cancelado && setEstado({ owner, ids: lista }))
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [remoto, owner]);

  useEffect(() => {
    if (estado.owner) localStorage.setItem(PREFIJO + estado.owner.toLowerCase(), JSON.stringify(estado.ids));
  }, [estado]);

  const esFavorito = (id) => ids.includes(id);

  // Cambia al instante y luego confirma con el servidor (si falla, se revierte).
  const alternar = async (id) => {
    if (!owner) return;
    const anterior = ids;
    const marcado = ids.includes(id);
    setEstado({ owner, ids: marcado ? ids.filter((x) => x !== id) : [id, ...ids] });
    if (!remoto) return;
    try {
      const lista = await (marcado ? quitarFavorito(id) : agregarFavorito(id));
      setEstado((e) => (e.owner === owner ? { owner, ids: lista } : e));
    } catch {
      setEstado((e) => (e.owner === owner ? { owner, ids: anterior } : e));
    }
  };

  return (
    <FavoritesContext.Provider value={{ favoritos: ids, esFavorito, alternar, puedeUsar: Boolean(owner) }}>
      {children}
    </FavoritesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites debe usarse dentro de FavoritesProvider');
  return ctx;
}
