import { flushSync } from 'react-dom';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle({ inverted = false }) {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro';

  // El nuevo tema se "expande" en un círculo desde el botón (View Transitions API).
  // En navegadores sin soporte, o con "reducir movimiento", cambia directamente.
  const cambiar = (e) => {
    const sinMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || sinMovimiento) {
      toggleTheme();
      return;
    }
    const caja = e.currentTarget.getBoundingClientRect();
    const x = caja.left + caja.width / 2;
    const y = caja.top + caja.height / 2;
    const radio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const siguiente = theme === 'light' ? 'dark' : 'light';

    const transicion = document.startViewTransition(() => {
      document.documentElement.setAttribute('data-theme', siguiente);
      flushSync(toggleTheme);
    });
    transicion.ready
      .then(() =>
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radio}px at ${x}px ${y}px)`] },
          { duration: 650, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' }
        )
      )
      .catch(() => {});
  };

  return (
    <button
      className={`icon-btn ${inverted ? styles.inverted : ''}`}
      onClick={cambiar}
      aria-label={label}
      title={label}
    >
      {/* key: el ícono se vuelve a montar y gira al cambiar de sol a luna */}
      <span key={theme} className={styles.icono}>
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </span>
    </button>
  );
}
