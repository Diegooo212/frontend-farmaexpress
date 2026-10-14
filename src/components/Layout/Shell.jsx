import { useLocation } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import styles from './Shell.module.css';

export default function Shell({ children }) {
  const { pathname } = useLocation();
  return (
    <div className={styles.shell}>
      <Navbar />
      <main key={pathname} className={styles.content}>
        {children}
      </main>
    </div>
  );
}