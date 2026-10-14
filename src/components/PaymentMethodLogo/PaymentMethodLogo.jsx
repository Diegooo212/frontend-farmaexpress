import { METODOS_PAGO } from '../../utils/checkout';
import styles from './PaymentMethodLogo.module.css';

// Distintivo del medio de pago (texto con el color de la marca, sin imágenes externas).
export default function PaymentMethodLogo({ codigo, size = 'md' }) {
  const metodo = METODOS_PAGO[codigo];
  if (!metodo) return null;
  return (
    <span className={`${styles.logo} ${styles[size]}`} style={{ '--marca': metodo.color }} aria-hidden="true">
      {metodo.marca}
    </span>
  );
}
