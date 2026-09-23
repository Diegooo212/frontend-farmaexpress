import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiErrorMessage } from '../../api/httpClient';
import AuthLayout from '../../components/Layout/AuthLayout';
import PasswordInput from '../../components/PasswordInput/PasswordInput';
import styles from '../../components/Layout/AuthForm.module.css';

export default function Login() {
  const {
    login,
    isAuthenticated,
    loginWithMicrosoft,
    microsoftEnabled,
    microsoftPending,
    microsoftError,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Vuelve a la página desde donde se pidió iniciar sesión (por ejemplo, el catálogo).
  const from = location.state?.from || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleLocalSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'No pudimos iniciar sesión.'));
      setSending(false);
    }
  };

  return (
    <AuthLayout title="Iniciar sesión" subtitle="Entra para comprar y seguir tus recetas.">
      <form className={styles.form} onSubmit={handleLocalSubmit}>
        <label className="field" htmlFor="login-email">
          Correo electrónico
          <input
            id="login-email"
            className="input"
            type="email"
            autoComplete="email"
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="field" htmlFor="login-password">
          Contraseña
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <Link to="/recuperar-password" className={styles.inlineLink}>
          ¿Olvidaste tu contraseña?
        </Link>

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={sending}>
          {sending ? 'Entrando…' : 'Iniciar sesión'}
        </button>
      </form>

      <div className={styles.divider}>o</div>

      <button
        type="button"
        className="btn btn-outline btn-block"
        onClick={loginWithMicrosoft}
        disabled={!microsoftEnabled || microsoftPending}
        title={!microsoftEnabled ? 'El acceso con Microsoft aún no está configurado' : undefined}
      >
        <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
          <rect x="1" y="1" width="9" height="9" fill="#f25022" />
          <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
          <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
          <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
        </svg>
        {microsoftPending ? 'Entrando con Microsoft…' : 'Continuar con Microsoft'}
      </button>
      {!microsoftEnabled && (
        <p className="field-hint">El acceso con Microsoft todavía no está disponible.</p>
      )}
      {microsoftError && (
        <p className="alert alert-error" role="alert">
          {microsoftError}
        </p>
      )}

      <p className={styles.footnote}>
        ¿No tienes cuenta? <Link to="/registro">Crear una cuenta</Link>
      </p>
    </AuthLayout>
  );
}
