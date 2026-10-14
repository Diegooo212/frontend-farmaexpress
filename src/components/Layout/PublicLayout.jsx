import { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import PublicHeader from './PublicHeader';
import Logo from '../Logo/Logo';
import PaymentMethodLogo from '../PaymentMethodLogo/PaymentMethodLogo';
import useReveal from '../../hooks/useReveal';
import styles from './PublicLayout.module.css';

// Mismas sucursales que el inventario (V2__inventario_inicial.sql).
const FARMACIAS = [
  { nombre: 'Farmacia Centro', direccion: "Av. Libertador Bernardo O'Higgins 1200, Santiago" },
  { nombre: 'Farmacia Norte', direccion: 'Av. Independencia 850, Independencia' },
  { nombre: 'Farmacia Sur', direccion: 'Gran Avenida José Miguel Carrera 5400, San Miguel' },
];

export default function PublicLayout({ children }) {
  const layoutRef = useRef(null);
  const { pathname } = useLocation();
  useReveal(layoutRef);

  return (
    <div className={styles.layout} ref={layoutRef}>
      <PublicHeader />
      {/* key: al cambiar de página el contenido se vuelve a montar y entra con animación */}
      <main key={pathname} className={styles.content}>
        {children}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Logo inverted />
            <p>Medicamentos y recetas médicas sin filas.</p>
            <ul className={styles.contacto}>
              <li>
                <Phone size={16} aria-hidden="true" /> 600 123 4567
              </li>
              <li>
                <Mail size={16} aria-hidden="true" /> contacto@farmaexpress.cl
              </li>
              <li>
                <Clock size={16} aria-hidden="true" /> Lun a vie 9:00–20:00 · Sáb 10:00–14:00
              </li>
            </ul>
          </div>

          <div>
            <h2 className={styles.footerTitle}>Nuestras farmacias</h2>
            <ul className={styles.footerList}>
              {FARMACIAS.map((f) => (
                <li key={f.nombre} className={styles.farmacia}>
                  <MapPin size={15} aria-hidden="true" />
                  <span>
                    <strong>{f.nombre}</strong>
                    <small>{f.direccion}</small>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={styles.footerTitle}>Ayuda</h2>
            <ul className={styles.footerList}>
              <li>
                <Link to="/ayuda">Preguntas frecuentes</Link>
              </li>
              <li>
                <Link to="/ayuda#despacho">Despacho y retiro</Link>
              </li>
              <li>
                <Link to="/ayuda#recetas">Compras con receta</Link>
              </li>
              <li>
                <Link to="/terminos">Términos y condiciones</Link>
              </li>
              <li>
                <Link to="/privacidad">Política de privacidad</Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className={styles.footerTitle}>Medios de pago</h2>
            <div className={styles.pagos}>
              <PaymentMethodLogo codigo="WEBPAY" size="sm" />
              <PaymentMethodLogo codigo="MERCADOPAGO" size="sm" />
              <PaymentMethodLogo codigo="KHIPU" size="sm" />
            </div>
            <p className={styles.footerText}>
              Despacho gratis desde $25.000 en la Región Metropolitana. Retiro en farmacia siempre gratis.
            </p>
          </div>
        </div>

        <div className={styles.legal}>
          <p>
            Químico farmacéutico responsable: Q.F. Carla Muñoz. Los medicamentos de venta bajo receta solo se
            despachan con receta médica validada.
          </p>
          <p>© 2026 FarmaExpress. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
