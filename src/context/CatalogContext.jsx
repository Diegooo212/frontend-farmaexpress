import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getMedicamentos,
  createMedicamento as apiCreate,
  updateMedicamento as apiUpdate,
} from '../api/catalogApi';
import { CATALOG_MOCK } from '../mocks/catalogMock';

const CatalogContext = createContext(null);
const STORAGE_KEY = 'farmaexpress_catalog_mock';

function getStoredMock() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) ? stored : null;
  } catch {
    return null;
  }
}

function saveStoredMock(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function CatalogProvider({ children }) {
  const [medicamentos, setMedicamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMedicamentos();
      setMedicamentos(data);
      setUsingMock(false);
    } catch {
      const stored = getStoredMock();
      const initial = stored || CATALOG_MOCK;
      setMedicamentos(initial);
      setUsingMock(true);
      if (!stored) saveStoredMock(initial);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial del catálogo sincronizando con el backend (o el mock de respaldo).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const updateMockState = (updater) => {
    setMedicamentos((prev) => {
      const next = updater(prev);
      saveStoredMock(next);
      return next;
    });
  };

  const createMedicamento = async (payload) => {
    if (usingMock) {
      updateMockState((prev) => [...prev, { id: Date.now(), ...payload }]);
      return;
    }
    await apiCreate(payload);
    load();
  };

  const updateMedicamento = async (id, changes) => {
    if (usingMock) {
      updateMockState((prev) => prev.map((m) => (m.id === id ? { ...m, ...changes } : m)));
      return;
    }
    const medicamento = medicamentos.find((m) => m.id === id);
    await apiUpdate(id, { ...medicamento, ...changes });
    load();
  };

  const purchase = async (items) => {
    if (usingMock) {
      updateMockState((prev) =>
        prev.map((m) => {
          const purchased = items.find((i) => i.id === m.id);
          if (!purchased) return m;
          return { ...m, stock: Math.max(0, m.stock - purchased.cantidad) };
        })
      );
      return;
    }
    for (const item of items) {
      const medicamento = medicamentos.find((m) => m.id === item.id);
      if (medicamento) {
        await apiUpdate(item.id, {
          ...medicamento,
          stock: Math.max(0, medicamento.stock - item.cantidad),
        });
      }
    }
    load();
  };

  return (
    <CatalogContext.Provider
      value={{
        medicamentos,
        loading,
        usingMock,
        createMedicamento,
        updateMedicamento,
        purchase,
        refresh: load,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog debe usarse dentro de CatalogProvider');
  return ctx;
}