import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock, ShieldCheck, Stethoscope, Truck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { usePrescriptions } from '../../context/PrescriptionsContext';
import MedBox from '../../components/MedBox/MedBox';
import CategoryIcon from '../../components/CategoryIcon/CategoryIcon';
import ProductCard from '../../components/ProductCard/ProductCard';
import ProductDetailModal from '../../components/ProductDetailModal/ProductDetailModal';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import StatusTrack from '../../components/StatusTrack/StatusTrack';
import { formatDate } from '../../utils/format';
import { isOwnReceta, lastNote } from '../../utils/prescriptionStatus';
import styles from './Home.module.css';

const SHELF_SHAPES = ['tall', 'standard', 'tall'];

// Selección para la portada: lo básico de un botiquín.
const RECOMENDADOS = ['MED-001', 'MED-004', 'MED-102', 'MED-105', 'MED-006', 'MED-107', 'MED-114', 'MED-115'];

const BENEFICIOS = [
  { icono: Clock, titulo: 'Retira en 2 horas', texto: 'En Farmacia Centro, Norte o Sur, sin filas.' },
  { icono: Truck, titulo: 'Despacho gratis', texto: 'En compras desde $25.000 en la Región Metropolitana.' },
  { icono: ShieldCheck, titulo: 'Pago seguro', texto: 'Webpay, Mercado Pago o Khipu.' },
  { icono: Stethoscope, titulo: 'Químico farmacéutico', texto: 'Valida tus recetas y resuelve tus dudas.' },
];

const PASOS = [
  {
    title: 'Envías tu receta',
    text: 'Sube una foto o PDF de la receta y elige si la retiras en farmacia o te la despachamos.',
  },
  {
    title: 'La validamos',
    text: 'Un químico farmacéutico revisa que la receta esté vigente y completa.',
  },
  {
    title: 'La preparamos',
    text: 'Reunimos tus medicamentos. Puedes seguir el avance desde Mis recetas.',
  },
  {
    title: 'Está lista',
    text: 'Retírala en Farmacia Centro, Norte o Sur, o recíbela en tu domicilio.',
  },
];

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const { medicamentos, categorias } = useCatalog();
  const [detalleId, setDetalleId] = useState(null);
  const detalle = medicamentos.find((m) => m.id === detalleId) || null;
  const { recetas } = usePrescriptions();
  const location = useLocation();

  // El enlace del header "Cómo funcionan las recetas" apunta a /#recetas: al cambiar el hash, bajamos a la sección.
  useEffect(() => {
    if (!location.hash) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [location]);

  const shelf = useMemo(
    () => medicamentos.filter((m) => m.stock > 0).slice(0, SHELF_SHAPES.length),
    [medicamentos]
  );

  const recomendados = useMemo(
    () =>
      RECOMENDADOS.map((sku) => medicamentos.find((m) => m.sku === sku))
        .filter((m) => m && m.stock > 0)
        .slice(0, 8),
    [medicamentos]
  );

  const ultimaReceta = useMemo(() => {
    if (!user?.nombre) return null;
    return (
      recetas
        .filter((r) => isOwnReceta(r, user))
        .sort((a, b) => String(b.fechaCreacion).localeCompare(String(a.fechaCreacion)))[0] || null
    );
  }, [recetas, user]);

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1 className={styles.title}>Remedios sin filas.</h1>
          <p className={styles.subtitle}>
            Compra tus medicamentos en línea o envía tu receta médica y retírala cuando esté lista
            en tu farmacia más cercana.
          </p>
          <div className={styles.heroActions}>
            <Link to="/catalogo" className="btn btn-primary">
              Ver catálogo
            </Link>
            <Link to={isAuthenticated ? '/mis-recetas' : '/login'} className="btn btn-outline">
              Enviar una receta
            </Link>
          </div>
        </div>

        <div className={styles.shelf} aria-hidden="true">
          <div className={styles.shelfBoxes}>
            {shelf.map((medicamento, index) => (
              <MedBox
                key={medicamento.id}
                medicamento={medicamento}
                size="lg"
                shape={SHELF_SHAPES[index]}
                className={styles.shelfBox}
              />
            ))}
          </div>
          <div className={styles.plank} />
        </div>
      </section>

      <ul className={`${styles.beneficios} reveal`} aria-label="Beneficios">
        {BENEFICIOS.map(({ icono: Icono, titulo, texto }) => (
          <li key={titulo}>
            <Icono size={26} aria-hidden="true" />
            <div>
              <strong>{titulo}</strong>
              <span>{texto}</span>
            </div>
          </li>
        ))}
      </ul>

      {categorias.length > 0 && (
        <section className={`${styles.seccion} reveal`} aria-labelledby="categorias-title">
          <div className={styles.seccionHead}>
            <h2 id="categorias-title" className={styles.sectionTitle}>
              Compra por categoría
            </h2>
            <Link to="/catalogo" className={styles.verTodo}>
              Ver todo <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.categorias}>
            {categorias.map((c) => (
              <Link key={c.slug} to={`/catalogo?categoria=${c.slug}`} className={styles.categoria}>
                <span className={styles.categoriaIcono}>
                  <CategoryIcon icono={c.icono} size={24} />
                </span>
                <strong>{c.nombre}</strong>
                <small>
                  {c.productos} {c.productos === 1 ? 'producto' : 'productos'}
                </small>
              </Link>
            ))}
          </div>
        </section>
      )}

      {recomendados.length > 0 && (
        <section className={`${styles.seccion} reveal`} aria-labelledby="recomendados-title">
          <div className={styles.seccionHead}>
            <div>
              <h2 id="recomendados-title" className={styles.sectionTitle}>
                Básicos para tu botiquín
              </h2>
              <p className={styles.sectionLead}>Lo que conviene tener siempre en casa.</p>
            </div>
            <Link to="/catalogo" className={styles.verTodo}>
              Ver catálogo <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.productos}>
            {recomendados.map((m) => (
              <ProductCard key={m.id} medicamento={m} isAdmin={false} onViewDetail={(p) => setDetalleId(p.id)} />
            ))}
          </div>
        </section>
      )}

      <ProductDetailModal key={detalleId} medicamento={detalle} isOpen={!!detalle} onClose={() => setDetalleId(null)} />

      <section id="recetas" className={`${styles.recipes} reveal`} aria-labelledby="recetas-title">
        <div className={styles.recipesIntro}>
          <h2 id="recetas-title" className={styles.sectionTitle}>
            ¿Tienes una receta médica? Envíala antes de venir.
          </h2>
          <p className={styles.sectionLead}>
            Sigue en qué paso va desde tu cuenta y pasa a buscarla cuando esté lista. Si prefieres, te la
            llevamos a domicilio en algunas comunas de la Región Metropolitana.
          </p>

          {ultimaReceta ? (
            <div className={styles.latest}>
              <div className={styles.latestHead}>
                <span>Tu última receta, del {formatDate(ultimaReceta.fechaCreacion)}</span>
                <StatusBadge status={ultimaReceta.status} />
              </div>
              <StatusTrack status={ultimaReceta.status} motivo={lastNote(ultimaReceta, 'RECHAZADA')} />
              <Link to="/mis-recetas" className="btn btn-outline btn-sm">
                Ver mis recetas
              </Link>
            </div>
          ) : (
            <Link to={isAuthenticated ? '/mis-recetas' : '/login'} className="btn btn-primary">
              {isAuthenticated ? 'Enviar una receta' : 'Inicia sesión para enviar tu receta'}
            </Link>
          )}
        </div>

        <ol className={styles.steps}>
          {PASOS.map((paso, index) => (
            <li key={paso.title} className={styles.step}>
              <span className={styles.stepNumber}>{index + 1}</span>
              <div>
                <h3 className={styles.stepTitle}>{paso.title}</h3>
                <p className={styles.stepText}>{paso.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
