import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PasswordInput from '../../components/PasswordInput/PasswordInput';
import styles from './Register.module.css';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', email: '', password: '', confirmPassword: '', rol: 'Cliente' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = (e) => {
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

    try {
      register(form);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>¡Cuenta creada!</h1>
          <p className={styles.subtitle}>Ya puedes iniciar sesión con tu correo y contraseña.</p>
          <button className={styles.submitButton} onClick={() => navigate('/login')}>
            Ir a iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Crear cuenta</h1>
        <p className={styles.subtitle}>Regístrate para pedir tus recetas</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="register-nombre">
            Nombre completo
            <input
              id="register-nombre"
              className={styles.input}
              type="text"
              value={form.nombre}
              onChange={handleChange('nombre')}
              required
            />
          </label>

          <label className={styles.label} htmlFor="register-email">
            Correo electrónico
            <input
              id="register-email"
              className={styles.input}
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              required
            />
          </label>

          <label className={styles.label} htmlFor="register-password">
            Contraseña
            <PasswordInput
              id="register-password"
              value={form.password}
              onChange={handleChange('password')}
              required
            />
          </label>

          <label className={styles.label} htmlFor="register-confirm">
            Confirmar contraseña
            <PasswordInput
              id="register-confirm"
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              required
            />
          </label>

          <label className={styles.label} htmlFor="register-rol">
            Rol (solo para pruebas — cuando Azure esté conectado, esto lo definirá el tenant)
            <select
              id="register-rol"
              className={styles.input}
              value={form.rol || 'Cliente'}
              onChange={handleChange('rol')}
            >
              <option value="Cliente">Cliente</option>
              <option value="Operador">Operador (Químico Farmacéutico)</option>
              <option value="Admin">Admin</option>
            </select>
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitButton}>
            Crear cuenta
          </button>
        </form>

        <p className={styles.loginText}>
          ¿Ya tienes cuenta? <Link to="/login" className={styles.loginLink}>Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}