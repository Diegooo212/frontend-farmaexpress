import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePrescriptions } from '../../context/PrescriptionsContext';
import { getHistorial, isOwnReceta, patientMessage } from '../../utils/prescriptionStatus';
import { formatDateTime } from '../../utils/format';
import styles from './NotificationsButton.module.css';

const SEEN_PREFIX = 'farmaexpress_notif_seen_';
const MAX_ITEMS = 15;

// Avisos para el paciente: cada cambio de estado que hace la farmacia en sus recetas.
// Lo ya visto se recuerda por cuenta.
export default function NotificationsButton() {
  const { user } = useAuth();
  const { recetas } = usePrescriptions();
  const seenKey = `${SEEN_PREFIX}${(user?.email || '').toLowerCase()}`;
  const [seenAt, setSeenAt] = useState(() => localStorage.getItem(seenKey) || '');
  const [highlightSince, setHighlightSince] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const avisos = useMemo(
    () =>
      recetas
        .filter((r) => isOwnReceta(r, user))
        .flatMap((receta) =>
          getHistorial(receta)
            // El envío lo hizo el propio paciente: no es un aviso.
            .filter((h) => h.status !== 'INGRESADA')
            .map((h, i) => ({ ...h, receta, id: `${receta.id}-${h.fecha}-${i}` }))
        )
        .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
        .slice(0, MAX_ITEMS),
    [recetas, user]
  );

  const unread = avisos.filter((a) => String(a.fecha) > seenAt).length;

  useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      // Al abrir se marcan como vistos, pero se siguen resaltando los nuevos mientras esté abierto.
      const now = new Date().toISOString();
      setHighlightSince(seenAt);
      setSeenAt(now);
      localStorage.setItem(seenKey, now);
    }
    setOpen((o) => !o);
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        className="icon-btn"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unread > 0 ? `Avisos, ${unread} sin leer` : 'Avisos'}
      >
        <Bell size={21} />
        {unread > 0 && <span className={styles.badge}>{unread}</span>}
      </button>
      <span className="visually-hidden" aria-live="polite">
        {unread > 0 ? `Tienes ${unread} avisos nuevos sobre tus recetas` : ''}
      </span>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Avisos de tus recetas">
          <div className={styles.panelHead}>
            <h2>Avisos</h2>
            <Link to="/mis-recetas" onClick={() => setOpen(false)}>
              Ver mis recetas
            </Link>
          </div>
          {avisos.length === 0 ? (
            <p className={styles.empty}>
              Cuando la farmacia revise tus recetas, te avisaremos aquí.
            </p>
          ) : (
            <ul className={styles.list}>
              {avisos.map((aviso) => (
                <li
                  key={aviso.id}
                  className={`${styles.item} ${styles[aviso.status] || ''} ${
                    String(aviso.fecha) > highlightSince ? styles.new : ''
                  }`}
                >
                  <span className={styles.dot} aria-hidden="true" />
                  <div>
                    <p className={styles.message}>{patientMessage(aviso.receta, aviso.status)}</p>
                    {aviso.nota && <p className={styles.note}>{aviso.nota}</p>}
                    <p className={styles.meta}>
                      Receta del {formatDateTime(aviso.receta.fechaCreacion)}, aviso{' '}
                      {formatDateTime(aviso.fecha)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
