import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Truck } from 'lucide-react';
import Modal from '../Modal/Modal';
import { apiErrorMessage } from '../../api/httpClient';
import { getDisponibilidad, getSucursales, ingresarLote } from '../../api/inventoryApi';
import { useCatalog } from '../../context/CatalogContext';
import styles from './ProductForm.module.css';

const VACIO = {
  nombre: '',
  sku: '',
  precio: '',
  categoriaId: '',
  presentacion: '',
  laboratorio: '',
  principioActivo: '',
  descripcion: '',
  requiereReceta: false,
  bioequivalente: false,
  imagenUrl: '',
};

const desde = (m) =>
  m
    ? {
        nombre: m.nombre || '',
        sku: m.sku || '',
        precio: m.precio ?? '',
        categoriaId: m.categoriaId ?? '',
        presentacion: m.presentacion || '',
        laboratorio: m.laboratorio || '',
        principioActivo: m.principioActivo || '',
        descripcion: m.descripcion || '',
        requiereReceta: Boolean(m.requiereReceta),
        bioequivalente: Boolean(m.bioequivalente),
        imagenUrl: m.imagenUrl || '',
      }
    : VACIO;

// Vencimiento sugerido para un lote nuevo: dentro de un año.
const enUnAnio = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

const LOTE_VACIO = { sucursalId: '', cantidad: '', numeroLote: '', fechaVencimiento: '' };

// Alta y edición de la ficha completa de un producto (solo Administrador).
// El stock sale de los lotes del inventario (FEFO): aquí se agrega stock ingresando un lote nuevo.
export default function ProductForm({ isOpen, onClose, medicamento, categorias, onGuardar }) {
  const { refresh } = useCatalog();
  const [datos, setDatos] = useState(() => desde(medicamento));
  const [lote, setLote] = useState(() => ({ ...LOTE_VACIO, fechaVencimiento: enUnAnio() }));
  const [sucursales, setSucursales] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const editando = Boolean(medicamento);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelado = false;
    getSucursales()
      .then((s) => !cancelado && setSucursales(s))
      .catch(() => {});
    if (medicamento) {
      getDisponibilidad(medicamento.id)
        .then((d) => !cancelado && setDisponibilidad(d))
        .catch(() => !cancelado && setDisponibilidad([]));
    }
    return () => {
      cancelado = true;
    };
  }, [isOpen, medicamento]);

  const campoLote = (nombre) => (e) => setLote((l) => ({ ...l, [nombre]: e.target.value }));
  const conLote = Number(lote.cantidad) > 0;

  const campo = (nombre) => (e) => {
    const valor = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setDatos((d) => ({ ...d, [nombre]: valor }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    if (conLote && (!lote.sucursalId || !lote.numeroLote.trim() || !lote.fechaVencimiento)) {
      setError('Para agregar stock elige la sucursal, el número de lote y la fecha de vencimiento.');
      setGuardando(false);
      return;
    }
    let productoGuardado = false;
    try {
      const resultado = await onGuardar({
        ...datos,
        precio: Number(datos.precio),
        categoriaId: datos.categoriaId === '' ? null : Number(datos.categoriaId),
      });
      productoGuardado = true;
      const medicamentoId = editando ? medicamento.id : resultado?.id;
      if (conLote && medicamentoId) {
        await ingresarLote({
          medicamentoId,
          sucursalId: Number(lote.sucursalId),
          numeroLote: lote.numeroLote.trim(),
          fechaVencimiento: lote.fechaVencimiento,
          cantidad: Number(lote.cantidad),
        });
        // El inventario avisa el nuevo stock al catálogo por RabbitMQ: se recarga en un momento.
        setTimeout(() => refresh().catch(() => {}), 1500);
      }
      if (!editando) setDatos(VACIO);
      setLote({ ...LOTE_VACIO, fechaVencimiento: enUnAnio() });
      onClose();
    } catch (err) {
      setError(
        productoGuardado
          ? apiErrorMessage(err, 'El producto se guardó, pero no pudimos ingresar el stock.')
          : apiErrorMessage(err, 'No se pudo guardar el producto.')
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editando ? `Editar ${medicamento.nombre}` : 'Nuevo producto'} wide>
      <form className={styles.form} onSubmit={guardar}>
        <div className={styles.fila}>
          <label className="field">
            Nombre y dosis
            <input className="input" required maxLength={150} placeholder="Paracetamol 500mg" value={datos.nombre} onChange={campo('nombre')} />
          </label>
          <label className="field">
            Código (SKU)
            <input className="input" required maxLength={40} placeholder="MED-120" value={datos.sku} onChange={campo('sku')} />
          </label>
        </div>

        <div className={styles.fila}>
          <label className="field">
            Precio
            <input className="input" required type="number" min="0" value={datos.precio} onChange={campo('precio')} />
          </label>
          <label className="field">
            Categoría
            <select className="input" value={datos.categoriaId} onChange={campo('categoriaId')}>
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.fila}>
          <label className="field">
            Presentación
            <input className="input" maxLength={100} placeholder="Caja 16 comprimidos" value={datos.presentacion} onChange={campo('presentacion')} />
          </label>
          <label className="field">
            Laboratorio
            <input className="input" maxLength={100} value={datos.laboratorio} onChange={campo('laboratorio')} />
          </label>
        </div>

        <label className="field">
          Principio activo
          <input className="input" maxLength={150} placeholder="Paracetamol" value={datos.principioActivo} onChange={campo('principioActivo')} />
        </label>

        <label className="field">
          Descripción
          <textarea
            className={`input ${styles.textarea}`}
            maxLength={1000}
            rows={4}
            placeholder="Para qué sirve, cómo se usa y precauciones."
            value={datos.descripcion}
            onChange={campo('descripcion')}
          />
        </label>

        <label className="field">
          Foto (URL)
          <input
            className="input"
            type="url"
            maxLength={500}
            pattern="https://.+"
            placeholder="https://…/foto.jpg"
            value={datos.imagenUrl}
            onChange={campo('imagenUrl')}
          />
          <span className="field-hint">Opcional. Debe empezar con https://. Si no hay foto, se muestra la caja dibujada.</span>
        </label>

        <div className={styles.checks}>
          <label className={styles.check}>
            <input type="checkbox" checked={datos.requiereReceta} onChange={campo('requiereReceta')} />
            <span>
              <strong>Venta bajo receta</strong>
              <small>Para comprarlo, el cliente necesita una receta validada.</small>
            </span>
          </label>
          <label className={styles.check}>
            <input type="checkbox" checked={datos.bioequivalente} onChange={campo('bioequivalente')} />
            <span>
              <strong>Bioequivalente</strong>
              <small>Muestra el sello amarillo de bioequivalencia.</small>
            </span>
          </label>
        </div>

        <fieldset className={styles.stock}>
          <legend>Stock</legend>

          {editando && disponibilidad && disponibilidad.length > 0 && (
            <ul className={styles.stockActual}>
              {disponibilidad.map((s) => (
                <li key={s.sucursalId}>
                  {s.tipo === 'CENTRAL' ? <Truck size={15} aria-hidden="true" /> : <MapPin size={15} aria-hidden="true" />}
                  <span>{s.tipo === 'CENTRAL' ? 'Despacho (almacén central)' : s.sucursal}</span>
                  <strong>{s.disponible}</strong>
                </li>
              ))}
            </ul>
          )}

          <p className="field-hint">
            {editando ? 'Agregar stock: ingresa un lote nuevo.' : 'Stock inicial (opcional): ingresa el primer lote.'} Cada
            lote tiene su vencimiento y se vende primero el que vence antes.
          </p>
          <div className={styles.fila}>
            <label className="field">
              Sucursal
              <select className="input" value={lote.sucursalId} onChange={campoLote('sucursalId')}>
                <option value="">Elegir…</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Cantidad
              <input className="input" type="number" min="1" max="100000" placeholder="0" value={lote.cantidad} onChange={campoLote('cantidad')} />
            </label>
          </div>
          <div className={styles.fila}>
            <label className="field">
              N° de lote
              <input className="input" maxLength={40} placeholder="L-2026-001" value={lote.numeroLote} onChange={campoLote('numeroLote')} />
            </label>
            <label className="field">
              Vencimiento
              <input className="input" type="date" value={lote.fechaVencimiento} onChange={campoLote('fechaVencimiento')} />
            </label>
          </div>
          {editando && (
            <p className="field-hint">
              Para descontar unidades (vencidas o dañadas) usa <Link to="/inventario" onClick={onClose}>Dar de baja en Inventario</Link>.
            </p>
          )}
        </fieldset>
        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={guardando}>
          {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </form>
    </Modal>
  );
}
