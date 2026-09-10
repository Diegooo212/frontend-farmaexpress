import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getPrescriptions,
  createPrescription as apiCreate,
  updatePrescriptionStatus as apiUpdateStatus,
} from '../api/prescriptionsApi';
import { PRESCRIPTIONS_MOCK } from '../mocks/prescriptionsMock';

const PrescriptionsContext = createContext(null);
const STORAGE_KEY = 'farmaexpress_prescriptions_mock';

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

export function PrescriptionsProvider({ children }) {
  const [recetas, setRecetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPrescriptions();
      setRecetas(data);
      setUsingMock(false);
    } catch (err) {
      const stored = getStoredMock();
      const initial = stored || PRESCRIPTIONS_MOCK;
      setRecetas(initial);
      setUsingMock(true);
      if (!stored) saveStoredMock(initial);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateMockState = (updater) => {
    setRecetas((prev) => {
      const next = updater(prev);
      saveStoredMock(next);
      return next;
    });
  };

  const createReceta = async (payload) => {
    if (usingMock) {
      const nueva = {
        id: Date.now(),
        status: 'INGRESADA',
        fechaCreacion: new Date().toISOString().slice(0, 10),
        ...payload,
      };
      updateMockState((prev) => [nueva, ...prev]);
      return nueva;
    }
    const nueva = await apiCreate(payload);
    load();
    return nueva;
  };

  const updateStatus = async (id, status) => {
    if (usingMock) {
      updateMockState((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      return;
    }
    await apiUpdateStatus(id, status);
    load();
  };

  return (
    <PrescriptionsContext.Provider
      value={{ recetas, loading, usingMock, createReceta, updateStatus, refresh: load }}
    >
      {children}
    </PrescriptionsContext.Provider>
  );
}

export function usePrescriptions() {
  const ctx = useContext(PrescriptionsContext);
  if (!ctx) throw new Error('usePrescriptions debe usarse dentro de PrescriptionsProvider');
  return ctx;
}