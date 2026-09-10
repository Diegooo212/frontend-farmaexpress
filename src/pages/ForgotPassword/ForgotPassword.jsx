import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './ForgotPassword.module.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {sent ? (
          <>
            <h1 className={styles.title}>Revisa tu correo</h1>
            <p className={styles.subtitle}>
              Si <strong>{email}</strong> está registrado, te enviamos un enlace para restablecer
              tu contraseña. (Simulado — todavía no hay backend de correo conectado.)
            </p>
          </>
        ) : (
          <>
            <h1 className={styles.title}>Recuperar contraseña</h1>
            <p className={styles.subtitle}>
              Ingresa tu correo y te enviaremos instrucciones para restablecerla.
            </p>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.label} htmlFor="forgot-email">
                Correo electrónico
                <input
                  id="forgot-email"
                  className={styles.input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <button type="submit" className={styles.submitButton}>
                Enviar enlace de recuperación
              </button>
            </form>
          </>
        )}

        <Link to="/login" className={styles.backLink}>
          ← Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
}