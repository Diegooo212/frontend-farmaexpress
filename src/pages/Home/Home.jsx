import { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { usePrescriptions } from '../../context/PrescriptionsContext';
import MedBox from '../../components/MedBox/MedBox';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import StatusTrack from '../../components/StatusTrack/StatusTrack';
import { formatDate } from '../../utils/format';
import { isOwnReceta, lastNote } from '../../utils/prescriptionStatus';
import CatalogSection from './CatalogSection';
import styles from './Home.module.css';

const SHELF_SHAPES = ['tall', 'standard', 'tall'];

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
  const { medicamentos } = useCatalog();
  const { recetas } = usePrescriptions();
  const location = useLocation();

  // Los enlaces del header apuntan a /#catalogo y /#recetas: al cambiar el hash, bajamos a la sección.
  useEffect(() => {
    if (!location.hash) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [location]);

  const shelf = useMemo(
    () => medicamentos.filter((m) => m.stock > 0).slice(0, SHELF_SHAPES.length),
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
            <Link to="/#catalogo" className="btn btn-primary">
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

      <CatalogSection />

      <section id="recetas" className={styles.recipes} aria-labelledby="recetas-title">
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
