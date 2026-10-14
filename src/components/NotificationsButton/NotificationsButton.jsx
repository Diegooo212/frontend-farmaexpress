import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePrescriptions } from '../../context/PrescriptionsContext';
import { getNotificaciones, marcarNotificacionesLeidas } from '../../api/notificationsApi';
import { getHistorial, isOwnReceta, patientMessage } from '../../utils/prescriptionStatus';
import { formatDateTime } from '../../utils/format';
import styles from './NotificationsButton.module.css';

const SEEN_PREFIX = 'farmaexpress_notif_seen_';
const MAX_ITEMS = 15;
const POLL_MS = 30000;

// Avisos para el cliente. Vienen del microservicio de notificaciones, que los crea a partir de
// eventos de RabbitMQ (cambios de estado de sus recetas y compras). Si ese servicio no responde
// (por ejemplo, un entorno donde aún no está desplegado), se arman desde el historial de las
// recetas y lo ya visto se recuerda por cuenta en el navegador.
export default function NotificationsButton() {
  const { user } = useAuth();
  const { recetas } = usePrescriptions();
  const userId = user?.id || null;
  const seenKey = `${SEEN_PREFIX}${(userId || '').toLowerCase()}`;
  const [seenAt, setSeenAt] = useState(() => localStorage.getItem(seenKey) || '');
  const [highlightSince, setHighlightSince] = useState('');
  // Avisos del microservicio, por cuenta. items = null: el servicio no está disponible.
  const [remotas, setRemotas] = useState({ owner: null, items: null });
  const [resaltadas, setResaltadas] = useState(() => new Set());
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const cargar = useCallback(() => {
    if (!userId) return;
    getNotificaciones()
      .then((items) => setRemotas({ owner: userId, items: Array.isArray(items) ? items : null }))
      .catch(() => setRemotas({ owner: userId, items: null }));
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;
    cargar();
    const id = setInterval(cargar, POLL_MS);
    return () => clearInterval(id);
  }, [userId, cargar]);

  const servicio = remotas.owner === userId ? remotas.items : null;

  const derivados = useMemo(
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

  // Mismo formato para los dos orígenes.
  const avisos = servicio
    ? servicio.slice(0, MAX_ITEMS).map((n) => ({
        id: n.id,
        estado: n.estado,
        mensaje: n.mensaje,
        detalle: n.detalle,
        meta: `${n.titulo} · ${formatDateTime(n.fecha)}`,
        noLeido: !n.leida,
        nuevo: resaltadas.has(n.id),
      }))
    : derivados.map((a) => ({
        id: a.id,
        estado: a.status,
        mensaje: patientMessage(a.receta, a.status),
        detalle: a.nota,
        meta: `Receta del ${formatDateTime(a.receta.fechaCreacion)}, aviso ${formatDateTime(a.fecha)}`,
        noLeido: String(a.fecha) > seenAt,
        nuevo: String(a.fecha) > highlightSince,
      }));

  const unread = avisos.filter((a) => a.noLeido).length;

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

  // Cuando sube la cantidad de avisos sin leer, la campana se sacude.
  const campanaRef = useRef(null);
  const unreadPrevio = useRef(unread);
  useEffect(() => {
    const boton = campanaRef.current;
    if (boton && unread > unreadPrevio.current) {
      boton.classList.remove(styles.sacudir);
      void boton.offsetWidth;
      boton.classList.add(styles.sacudir);
    }
    unreadPrevio.current = unread;
  }, [unread]);

  const toggle = () => {
    if (!open) {
      // Al abrir se marcan como vistos, pero se siguen resaltando los nuevos mientras esté abierto.
      if (servicio) {
        const noLeidas = servicio.filter((n) => !n.leida);
        setResaltadas(new Set(noLeidas.map((n) => n.id)));
        if (noLeidas.length > 0) {
          marcarNotificacionesLeidas()
            .then(() =>
              setRemotas((prev) =>
                prev.owner === userId
                  ? { ...prev, items: prev.items?.map((n) => ({ ...n, leida: true })) ?? null }
                  : prev
              )
            )
            .catch(() => {});
        }
      } else {
        const now = new Date().toISOString();
        setHighlightSince(seenAt);
        setSeenAt(now);
        localStorage.setItem(seenKey, now);
      }
    }
    setOpen((o) => !o);
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        ref={campanaRef}
        className="icon-btn"
        onClick={toggle}
        onAnimationEnd={(e) => e.target === e.currentTarget && e.currentTarget.classList.remove(styles.sacudir)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unread > 0 ? `Avisos, ${unread} sin leer` : 'Avisos'}
      >
        <Bell size={21} />
        {unread > 0 && (
          <span key={unread} className={styles.badge}>
            {unread}
          </span>
        )}
      </button>
      <span className="visually-hidden" aria-live="polite">
        {unread > 0 ? `Tienes ${unread} avisos nuevos` : ''}
      </span>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Tus avisos">
          <div className={styles.panelHead}>
            <h2>Avisos</h2>
            <Link to="/mis-recetas" onClick={() => setOpen(false)}>
              Ver mis recetas
            </Link>
          </div>
          {avisos.length === 0 ? (
            <p className={styles.empty}>
              Cuando la farmacia revise tus recetas o hagas una compra, te avisaremos aquí.
            </p>
          ) : (
            <ul className={styles.list}>
              {avisos.map((aviso) => (
                <li
                  key={aviso.id}
                  className={`${styles.item} ${styles[aviso.estado] || ''} ${aviso.nuevo ? styles.new : ''}`}
                >
                  <span className={styles.dot} aria-hidden="true" />
                  <div>
                    <p className={styles.message}>{aviso.mensaje}</p>
                    {aviso.detalle && <p className={styles.note}>{aviso.detalle}</p>}
                    <p className={styles.meta}>{aviso.meta}</p>
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
