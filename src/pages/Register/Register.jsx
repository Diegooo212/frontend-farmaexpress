import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiErrorMessage } from '../../api/httpClient';
import AuthLayout from '../../components/Layout/AuthLayout';
import PasswordInput from '../../components/PasswordInput/PasswordInput';
import styles from '../../components/Layout/AuthForm.module.css';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setSending(true);
    try {
      await register(form);
      setSuccess(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'No pudimos crear la cuenta.'));
    } finally {
      setSending(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Cuenta creada" subtitle="Ya puedes iniciar sesión con tu correo y contraseña.">
        <button className="btn btn-primary btn-block" onClick={() => navigate('/login')}>
          Iniciar sesión
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Crear cuenta" subtitle="Con tu cuenta puedes comprar y enviar recetas médicas.">
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className="field" htmlFor="register-nombre">
          Nombre completo
          <input
            id="register-nombre"
            className="input"
            type="text"
            autoComplete="name"
            value={form.nombre}
            onChange={handleChange('nombre')}
            required
          />
        </label>

        <label className="field" htmlFor="register-email">
          Correo electrónico
          <input
            id="register-email"
            className="input"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange('email')}
            required
          />
        </label>

        <label className="field" htmlFor="register-password">
          Contraseña
          <PasswordInput
            id="register-password"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange('password')}
            required
          />
          <span className="field-hint">Al menos 8 caracteres.</span>
        </label>

        <label className="field" htmlFor="register-confirm">
          Repite la contraseña
          <PasswordInput
            id="register-confirm"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange('confirmPassword')}
            required
          />
        </label>

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={sending}>
          {sending ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>

      <p className={styles.footnote}>
        ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
      </p>
    </AuthLayout>
  );
}
