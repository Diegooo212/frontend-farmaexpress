import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest, isAzureConfigured } from '../../auth/msalConfig';
import { useAuth } from '../../context/AuthContext';
import PasswordInput from '../../components/PasswordInput/PasswordInput';
import styles from './Login.module.css';

export default function Login() {
  const { instance } = useMsal();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAzureLogin = () => {
    if (!isAzureConfigured) return;
    instance.loginRedirect(loginRequest);
  };

  const handleLocalSubmit = (e) => {
    e.preventDefault();
    setError('');
    try {
      login({ email, password });
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>FarmaExpress</h1>
        <p className={styles.subtitle}>Inicia sesión para continuar</p>

        <form className={styles.form} onSubmit={handleLocalSubmit}>
          <label className={styles.label} htmlFor="login-email">
            Correo electrónico
            <input
              id="login-email"
              className={styles.input}
              type="email"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className={styles.label} htmlFor="login-password">
            Contraseña
            <PasswordInput
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <Link to="/recuperar-password" className={styles.forgotLink}>
            ¿Olvidaste tu contraseña?
          </Link>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitButton}>
            Iniciar sesión
          </button>
        </form>

        <p className={styles.registerText}>
          ¿No tienes cuenta? <Link to="/registro" className={styles.registerLink}>Regístrate</Link>
        </p>

        <div className={styles.divider}>o</div>

        <button
          className={styles.azureButton}
          onClick={handleAzureLogin}
          disabled={!isAzureConfigured}
          title={!isAzureConfigured ? 'Azure AD aún no está configurado' : undefined}
        >
          Iniciar sesión con Microsoft
        </button>

        {!isAzureConfigured && (
          <p className={styles.warning}>
            Azure AD todavía no está configurado (falta el App Registration). Avísale a tu
            compañero para completar el .env.
          </p>
        )}
      </div>
    </div>
  );
}