import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Pagination.module.css';

// Números a mostrar: siempre la primera y la última, y las vecinas de la actual.
// Ej. página 7 de 42 → 1 … 6 7 8 … 42
function numerosVisibles(actual, total) {
  const numeros = new Set([1, total, actual - 1, actual, actual + 1]);
  const ordenados = [...numeros].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const resultado = [];
  ordenados.forEach((n, i) => {
    if (i > 0 && n - ordenados[i - 1] > 1) resultado.push(`salto-${n}`);
    resultado.push(n);
  });
  return resultado;
}

export default function Pagination({ pagina, totalPaginas, onCambiar, etiqueta = 'Paginación' }) {
  if (totalPaginas <= 1) return null;

  return (
    <nav className={styles.paginacion} aria-label={etiqueta}>
      <button
        type="button"
        className={styles.flecha}
        onClick={() => onCambiar(pagina - 1)}
        disabled={pagina === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft size={18} aria-hidden="true" />
        <span>Anterior</span>
      </button>

      <ol className={styles.numeros}>
        {numerosVisibles(pagina, totalPaginas).map((n) =>
          typeof n === 'string' ? (
            <li key={n} className={styles.salto} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={n}>
              <button
                type="button"
                className={`${styles.numero} ${n === pagina ? styles.actual : ''}`}
                onClick={() => onCambiar(n)}
                aria-current={n === pagina ? 'page' : undefined}
                aria-label={`Página ${n}`}
              >
                {n}
              </button>
            </li>
          )
        )}
      </ol>

      <button
        type="button"
        className={styles.flecha}
        onClick={() => onCambiar(pagina + 1)}
        disabled={pagina === totalPaginas}
        aria-label="Página siguiente"
      >
        <span>Siguiente</span>
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </nav>
  );
}
