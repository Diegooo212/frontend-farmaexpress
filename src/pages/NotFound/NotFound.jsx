import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import styles from './NotFound.module.css';

// 404: la dirección no existe. Se ofrece buscar en el catálogo o ir a lo más usado.
export default function NotFound() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');

  const buscar = (e) => {
    e.preventDefault();
    navigate(busqueda.trim() ? `/catalogo?q=${encodeURIComponent(busqueda.trim())}` : '/catalogo');
  };

  return (
    <section className={styles.page}>
      <p className={styles.codigo} aria-hidden="true">
        404
      </p>
      <h1 className={styles.title}>No encontramos esta página</h1>
      <p className={styles.lead}>
        La dirección <code>{pathname}</code> no existe o cambió. Busca lo que necesitas en el catálogo:
      </p>

      <form className={styles.buscador} onSubmit={buscar} role="search">
        <Search size={19} aria-hidden="true" />
        <label className="visually-hidden" htmlFor="buscar-404">
          Buscar medicamento
        </label>
        <input
          id="buscar-404"
          type="search"
          placeholder="Buscar medicamento"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <button className="btn btn-primary btn-sm">Buscar</button>
      </form>

      <nav className={styles.accesos} aria-label="Accesos">
        <Link to="/">Inicio</Link>
        <Link to="/catalogo">Catálogo</Link>
        <Link to="/mis-pedidos">Mis pedidos</Link>
        <Link to="/ayuda">Ayuda</Link>
      </nav>
    </section>
  );
}
