import Navbar from '../Navbar/Navbar';
import styles from './Shell.module.css';

export default function Shell({ children }) {
  return (
    <div className={styles.shell}>
      <Navbar />
      <main className={styles.content}>{children}</main>
    </div>
  );
}