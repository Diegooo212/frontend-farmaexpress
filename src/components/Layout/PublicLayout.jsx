import PublicHeader from './PublicHeader';
import styles from './PublicLayout.module.css';

export default function PublicLayout({ children }) {
  return (
    <div className={styles.layout}>
      <PublicHeader />
      <main className={styles.content}>{children}</main>
    </div>
  );
}