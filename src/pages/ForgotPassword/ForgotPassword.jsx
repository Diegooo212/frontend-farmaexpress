import { useState } from 'react';
import AuthLayout from '../../components/Layout/AuthLayout';
import styles from '../../components/Layout/AuthForm.module.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  if (sent) {
    return (
      <AuthLayout title="Revisa tu correo" backTo="/login" backLabel="Volver a iniciar sesión">
        <p>
          Si <strong>{email}</strong> tiene una cuenta, te enviamos un enlace para crear una nueva
          contraseña.
        </p>
        <p className="alert alert-info">
          Simulado: el envío de correos todavía no está conectado.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Recuperar contraseña"
      subtitle="Escribe tu correo y te enviaremos un enlace para crear una nueva."
      backTo="/login"
      backLabel="Volver a iniciar sesión"
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className="field" htmlFor="forgot-email">
          Correo electrónico
          <input
            id="forgot-email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="btn btn-primary btn-block">
          Enviar enlace
        </button>
      </form>
    </AuthLayout>
  );
}
