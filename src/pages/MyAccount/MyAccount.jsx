import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { Copy, KeyRound, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../auth/msalConfig';
import { decodeJwt, rolesDe, scopesDe } from '../../utils/jwt';
import { formatDateTime } from '../../utils/format';
import styles from './MyAccount.module.css';

const fecha = (segundos) => (segundos ? formatDateTime(new Date(segundos * 1000).toISOString()) : '—');

// Claims que conviene mostrar: quién emitió el token, para quién, a quién representa y qué permite.
const CLAIMS_ID = ['iss', 'aud', 'oid', 'name', 'email', 'preferred_username', 'roles', 'nonce', 'iat', 'exp'];
const CLAIMS_ACCESO = ['iss', 'aud', 'oid', 'scp', 'roles', 'azp', 'ver', 'iat', 'exp'];

function TablaClaims({ claims, nombres }) {
  return (
    <dl className={styles.claims}>
      {nombres
        .filter((nombre) => claims?.[nombre] !== undefined)
        .map((nombre) => {
          const valor = claims[nombre];
          const texto = nombre === 'iat' || nombre === 'exp' ? `${valor} (${fecha(valor)})` : Array.isArray(valor) ? valor.join(', ') : String(valor);
          return (
            <div key={nombre}>
              <dt>{nombre}</dt>
              <dd>{texto}</dd>
            </div>
          );
        })}
    </dl>
  );
}

export default function MyAccount() {
  const { instance, accounts } = useMsal();
  const { user, logout } = useAuth();
  const account = instance.getActiveAccount() || accounts[0];
  const [accessToken, setAccessToken] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!account) return;
    instance
      .acquireTokenSilent({ ...apiRequest, account })
      .then((res) => setAccessToken(res.accessToken))
      .catch(() => setError('No se pudo obtener el access token para la API.'));
  }, [instance, account]);

  const [copiado, setCopiado] = useState(false);

  // Para probar las rutas del API Gateway con curl / Postman durante la demo.
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(accessToken);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError('No se pudo copiar. Selecciona el token manualmente.');
    }
  };

  const idClaims = account?.idTokenClaims;
  const accessClaims = decodeJwt(accessToken);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Mi cuenta</h1>
          <p className={styles.subtitle}>
            Sesión iniciada con Microsoft Entra ID (OpenID Connect, Authorization Code + PKCE).
          </p>
        </div>
        <button className="btn btn-outline" onClick={logout}>
          <LogOut size={17} /> Cerrar sesión
        </button>
      </header>

      <section className={styles.resumen}>
        <div>
          <span className={styles.etiqueta}>Nombre</span>
          <strong>{user?.nombre}</strong>
        </div>
        <div>
          <span className={styles.etiqueta}>Correo</span>
          <strong>{user?.email || 'No informado'}</strong>
        </div>
        <div>
          <span className={styles.etiqueta}>Roles (claim roles)</span>
          <strong>{rolesDe(accessClaims || idClaims).join(', ') || 'Cliente (sin App Role)'}</strong>
        </div>
        <div>
          <span className={styles.etiqueta}>Scopes (claim scp)</span>
          <strong>{scopesDe(accessClaims).join(', ') || '—'}</strong>
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <h2>ID token</h2>
          <p className={styles.nota}>Identifica a la persona ante el frontend (OIDC).</p>
          <TablaClaims claims={idClaims} nombres={CLAIMS_ID} />
        </section>

        <section className={styles.panel}>
          <h2>
            <KeyRound size={18} aria-hidden="true" /> Access token para la API
          </h2>
          <p className={styles.nota}>
            Es el JWT que el interceptor envía en <code>Authorization: Bearer</code> a API Gateway y al BFF, que
            validan su firma, emisor (iss), audiencia (aud) y vigencia (exp).
          </p>
          {accessToken && (
            <button type="button" className="btn btn-outline btn-sm" onClick={copiar}>
              <Copy size={15} /> {copiado ? 'Copiado' : 'Copiar access token'}
            </button>
          )}
          {error && <p className="alert alert-error">{error}</p>}
          {accessClaims ? <TablaClaims claims={accessClaims} nombres={CLAIMS_ACCESO} /> : !error && <p>Obteniendo token…</p>}
        </section>
      </div>
    </div>
  );
}
