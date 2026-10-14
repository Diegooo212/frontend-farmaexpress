import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Home, MapPin, Package, Pencil, Phone, Star, Trash2, UserRound } from 'lucide-react';
import {
  actualizarDireccion,
  actualizarPerfil,
  agregarDireccion,
  eliminarDireccion,
  getDirecciones,
  getPerfil,
} from '../../api/accountApi';
import { apiErrorMessage } from '../../api/httpClient';
import { formatDate } from '../../utils/format';
import styles from './Account.module.css';
import Skeleton from '../../components/Skeleton/Skeleton';

const MAX_DIRECCIONES = 5;
const ROLES = { Admin: 'Administrador', Operador: 'Operador', Cliente: 'Cliente' };
const DIRECCION_VACIA = { alias: '', calle: '', depto: '', comuna: '', predeterminada: false };

export default function Account() {
  const [perfil, setPerfil] = useState(null);
  const [direcciones, setDirecciones] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(() => {
    Promise.all([getPerfil(), getDirecciones()])
      .then(([p, d]) => {
        setPerfil(p);
        setDirecciones(d);
      })
      .catch((err) => setError(apiErrorMessage(err, 'No pudimos cargar tu cuenta.')));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <span className={styles.avatar} aria-hidden="true">
          <UserRound size={30} />
        </span>
        <div>
          <h1 className={styles.title}>Mi cuenta</h1>
          {perfil && <p className={styles.muted}>Cliente desde el {formatDate(perfil.miembroDesde.slice(0, 10))}</p>}
        </div>
      </header>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      <nav className={styles.accesos} aria-label="Accesos de tu cuenta">
        <Link to="/mis-pedidos">
          <Package size={22} /> <span>Mis pedidos</span>
        </Link>
        <Link to="/mis-recetas">
          <FileText size={22} /> <span>Mis recetas</span>
        </Link>
        <Link to="/favoritos">
          <Star size={22} /> <span>Favoritos</span>
        </Link>
      </nav>

      <div className={styles.grid}>
        <DatosPersonales perfil={perfil} onGuardado={setPerfil} />
        <Direcciones direcciones={direcciones} onCambio={cargar} />
      </div>
    </section>
  );
}

function DatosPersonales({ perfil, onGuardado }) {
  const [editando, setEditando] = useState(false);
  const [telefono, setTelefono] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const editar = () => {
    setTelefono(perfil?.telefono || '');
    setError('');
    setEditando(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      onGuardado(await actualizarPerfil({ telefono }));
      setEditando(false);
    } catch (err) {
      setError(apiErrorMessage(err, 'No pudimos guardar el teléfono.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className={styles.bloque} aria-labelledby="datos-title">
      <h2 id="datos-title">Datos personales</h2>
      {!perfil ? (
        <Skeleton filas={1} alto={150} etiqueta="Cargando tus datos…" />
      ) : (
        <>
          <dl className={styles.datos}>
            <div>
              <dt>Nombre</dt>
              <dd>{perfil.nombre}</dd>
            </div>
            <div>
              <dt>Correo</dt>
              <dd>{perfil.email || 'Sin correo'}</dd>
            </div>
            <div>
              <dt>Tipo de cuenta</dt>
              <dd>{ROLES[perfil.rol] || perfil.rol}</dd>
            </div>
          </dl>
          <p className="field-hint">El nombre y el correo vienen de tu cuenta de Microsoft.</p>

          {editando ? (
            <form className={styles.form} onSubmit={guardar}>
              <label className="field">
                Teléfono
                <input
                  className="input"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+56 9 1234 5678"
                  maxLength={20}
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
                <span className="field-hint">Lo usamos para coordinar el despacho.</span>
              </label>
              {error && (
                <p className="alert alert-error" role="alert">
                  {error}
                </p>
              )}
              <div className={styles.botones}>
                <button className="btn btn-primary btn-sm" disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditando(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className={styles.telefono}>
              <Phone size={18} aria-hidden="true" />
              <span>{perfil.telefono || 'Sin teléfono'}</span>
              <button className="btn btn-outline btn-sm" onClick={editar}>
                {perfil.telefono ? 'Cambiar' : 'Agregar teléfono'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Direcciones({ direcciones, onCambio }) {
  const [formulario, setFormulario] = useState(null); // null | { id?, ...datos }
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const campo = (nombre) => (e) => {
    const valor = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormulario((f) => ({ ...f, [nombre]: valor }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const { id, ...datos } = formulario;
      if (id) await actualizarDireccion(id, datos);
      else await agregarDireccion(datos);
      setFormulario(null);
      onCambio();
    } catch (err) {
      setError(apiErrorMessage(err, 'No pudimos guardar la dirección.'));
    } finally {
      setGuardando(false);
    }
  };

  const accion = async (fn) => {
    setError('');
    try {
      await fn();
      onCambio();
    } catch (err) {
      setError(apiErrorMessage(err, 'No pudimos actualizar la dirección.'));
    }
  };

  const lista = direcciones || [];

  return (
    <section className={styles.bloque} aria-labelledby="direcciones-title">
      <div className={styles.bloqueHead}>
        <h2 id="direcciones-title">Direcciones de despacho</h2>
        {!formulario && lista.length < MAX_DIRECCIONES && (
          <button className="btn btn-outline btn-sm" onClick={() => setFormulario({ ...DIRECCION_VACIA })}>
            <MapPin size={16} /> Agregar
          </button>
        )}
      </div>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      {direcciones === null && <Skeleton filas={2} alto={64} etiqueta="Cargando tus direcciones…" />}
      {direcciones?.length === 0 && !formulario && (
        <p className={styles.muted}>Guarda tus direcciones para elegirlas rápido al comprar.</p>
      )}

      <ul className={styles.direcciones}>
        {lista.map((d) => (
          <li key={d.id} className={d.predeterminada ? styles.predeterminada : ''}>
            <Home size={20} aria-hidden="true" />
            <div className={styles.direccionTexto}>
              <strong>
                {d.alias}
                {d.predeterminada && <span className={styles.chip}>Predeterminada</span>}
              </strong>
              <span>{d.completa}</span>
            </div>
            <div className={styles.direccionAcciones}>
              {!d.predeterminada && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => accion(() => actualizarDireccion(d.id, { ...d, predeterminada: true }))}
                >
                  Usar por defecto
                </button>
              )}
              <button
                className="icon-btn"
                aria-label={`Editar ${d.alias}`}
                onClick={() =>
                  setFormulario({ id: d.id, alias: d.alias, calle: d.calle, depto: d.depto || '', comuna: d.comuna, predeterminada: d.predeterminada })
                }
              >
                <Pencil size={17} />
              </button>
              <button
                className="icon-btn"
                aria-label={`Eliminar ${d.alias}`}
                onClick={() => accion(() => eliminarDireccion(d.id))}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {formulario && (
        <form className={styles.form} onSubmit={guardar}>
          <div className={styles.fila}>
            <label className="field">
              Nombre
              <input className="input" required maxLength={40} placeholder="Casa" value={formulario.alias} onChange={campo('alias')} />
            </label>
            <label className="field">
              Comuna
              <input className="input" required maxLength={40} placeholder="Providencia" value={formulario.comuna} onChange={campo('comuna')} />
            </label>
          </div>
          <div className={styles.fila}>
            <label className="field">
              Calle y número
              <input
                className="input"
                required
                maxLength={120}
                autoComplete="address-line1"
                placeholder="Av. Providencia 1234"
                value={formulario.calle}
                onChange={campo('calle')}
              />
            </label>
            <label className="field">
              Depto. u oficina <span className="field-hint">(opcional)</span>
              <input className="input" maxLength={30} autoComplete="address-line2" value={formulario.depto} onChange={campo('depto')} />
            </label>
          </div>
          <label className={styles.check}>
            <input type="checkbox" checked={formulario.predeterminada} onChange={campo('predeterminada')} />
            Usar como dirección predeterminada
          </label>
          <div className={styles.botones}>
            <button className="btn btn-primary btn-sm" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar dirección'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFormulario(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      {lista.length >= MAX_DIRECCIONES && <p className="field-hint">Puedes guardar hasta {MAX_DIRECCIONES} direcciones.</p>}
    </section>
  );
}
