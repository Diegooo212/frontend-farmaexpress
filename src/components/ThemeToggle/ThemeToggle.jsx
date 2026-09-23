import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle({ inverted = false }) {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro';

  return (
    <button
      className={`icon-btn ${inverted ? styles.inverted : ''}`}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}
