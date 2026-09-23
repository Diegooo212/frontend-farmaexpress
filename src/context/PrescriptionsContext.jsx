import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getPrescriptions,
  createPrescription as apiCreate,
  updatePrescriptionStatus as apiUpdateStatus,
} from '../api/prescriptionsApi';
import { isNetworkError } from '../api/httpClient';
import { useAuth } from './AuthContext';
import { PRESCRIPTIONS_MOCK } from '../mocks/prescriptionsMock';
import { saveRecetaFile } from '../utils/fileStore';

const PrescriptionsContext = createContext(null);
const STORAGE_KEY = 'farmaexpress_prescriptions_mock';
const POLL_INTERVAL = 30000;

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
  const { user } = useAuth();
  const account = user?.email || null;
  const [recetas, setRecetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  // El backend decide qué recetas ve cada cuenta (paciente: las suyas; personal: todas).
  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!account) {
        setRecetas([]);
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const data = await getPrescriptions();
        setRecetas(data);
        setUsingMock(false);
      } catch (err) {
        // Solo sin conexión se usan datos de ejemplo; un error del servidor no se disfraza.
        if (isNetworkError(err)) {
          const stored = getStoredMock();
          const initial = stored || PRESCRIPTIONS_MOCK;
          setRecetas(initial);
          setUsingMock(true);
          if (!stored) saveStoredMock(initial);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [account]
  );

  useEffect(() => {
    // Se carga al abrir la app y cada vez que cambia la cuenta con sesión.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Sin backend: los cambios hechos en otra pestaña (por ejemplo, el operador validando) llegan al instante.
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      const stored = getStoredMock();
      if (stored) setRecetas(stored);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Con backend, se consulta cada 30 segundos para traer los cambios de estado (y avisar al paciente).
  useEffect(() => {
    if (usingMock || loading || !account) return undefined;
    const timer = setInterval(() => load({ silent: true }), POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [usingMock, loading, account, load]);

  const updateMockState = (updater) => {
    setRecetas((prev) => {
      const next = updater(prev);
      saveStoredMock(next);
      return next;
    });
  };

  const createReceta = async (payload, archivo) => {
    if (usingMock) {
      const ahora = new Date().toISOString();
      const nueva = {
        id: Date.now(),
        status: 'INGRESADA',
        fechaCreacion: ahora.slice(0, 10),
        historial: [{ status: 'INGRESADA', fecha: ahora, por: payload.pacienteNombre }],
        ...payload,
        archivoNombre: archivo?.name,
        archivoTipo: archivo?.type,
      };
      // El archivo se guarda antes de publicar la receta para que el operador ya pueda verlo.
      if (archivo) await saveRecetaFile(nueva.id, archivo);
      updateMockState((prev) => [nueva, ...prev]);
      return nueva;
    }

    // La cuenta que envía la receta la toma el backend del token, no del formulario.
    const datos = { ...payload };
    delete datos.cuentaEmail;
    delete datos.cuentaNombre;
    const nueva = await apiCreate(datos, archivo);
    setRecetas((prev) => [nueva, ...prev.filter((r) => r.id !== nueva.id)]);
    return nueva;
  };

  // `nota` es el mensaje para el paciente (obligatorio al rechazar); `por` quién hizo el cambio.
  const updateStatus = async (id, status, { nota, por } = {}) => {
    if (usingMock) {
      const entry = { status, fecha: new Date().toISOString(), nota: nota?.trim() || undefined, por };
      updateMockState((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status,
                historial: [
                  ...(r.historial?.length ? r.historial : [{ status: r.status, fecha: r.fechaCreacion }]),
                  entry,
                ],
              }
            : r
        )
      );
      return;
    }
    const actualizada = await apiUpdateStatus(id, status, nota?.trim() || undefined);
    setRecetas((prev) => prev.map((r) => (r.id === id ? actualizada : r)));
  };

  return (
    <PrescriptionsContext.Provider
      value={{ recetas, loading, usingMock, createReceta, updateStatus, refresh: load }}
    >
      {children}
    </PrescriptionsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePrescriptions() {
  const ctx = useContext(PrescriptionsContext);
  if (!ctx) throw new Error('usePrescriptions debe usarse dentro de PrescriptionsProvider');
  return ctx;
}
