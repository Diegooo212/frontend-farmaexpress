import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../components/Layout/AuthLayout';
import styles from '../../components/Layout/AuthForm.module.css';

function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

// Inicio de sesión y registro con Microsoft Entra External ID (OIDC, Authorization Code + PKCE).
// mode="registro" abre directamente la pantalla de crear cuenta del tenant.
export default function Login({ mode = 'login' }) {
  const { isAuthenticated, loading, login, register, microsoftEnabled } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';
  const esRegistro = mode === 'registro';

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  return (
    <AuthLayout
      title={esRegistro ? 'Crear cuenta' : 'Iniciar sesión'}
      subtitle={
        esRegistro
          ? 'Crea tu cuenta con tu correo y una contraseña, o con tu cuenta de Microsoft.'
          : 'Entra para comprar y seguir tus recetas.'
      }
    >
      <div className={styles.form}>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => (esRegistro ? register(from) : login(from))}
          disabled={!microsoftEnabled || loading}
        >
          <MicrosoftLogo />
          {loading ? 'Conectando con Microsoft…' : esRegistro ? 'Crear cuenta' : 'Iniciar sesión'}
        </button>

        <p className="field-hint">
          <ShieldCheck size={15} style={{ verticalAlign: '-3px', marginRight: '0.3rem' }} aria-hidden="true" />
          Tu cuenta la protege Microsoft Entra ID. FarmaExpress nunca ve tu contraseña.
        </p>

        {!microsoftEnabled && (
          <p className="alert alert-error" role="alert">
            Falta configurar Entra ID (VITE_AZURE_CLIENT_ID, VITE_AZURE_TENANT_ID y VITE_AZURE_API_CLIENT_ID).
          </p>
        )}
      </div>

      <p className={styles.footnote}>
        {esRegistro ? (
          <>
            ¿Ya tienes cuenta? <Link to="/login" state={location.state}>Iniciar sesión</Link>
          </>
        ) : (
          <>
            ¿No tienes cuenta? <Link to="/registro" state={location.state}>Crear una cuenta</Link>
          </>
        )}
      </p>
    </AuthLayout>
  );
}
