import { useMemo, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { useDebounce } from '../../hooks/useDebounce';
import { apiErrorMessage } from '../../api/httpClient';
import Modal from '../../components/Modal/Modal';
import ProductCard from '../../components/ProductCard/ProductCard';
import ProductDetailModal from '../../components/ProductDetailModal/ProductDetailModal';
import styles from './CatalogSection.module.css';

const SORTERS = {
  relevancia: null,
  'precio-asc': (a, b) => a.precio - b.precio,
  'precio-desc': (a, b) => b.precio - a.precio,
  nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
};

const EMPTY_FORM = { nombre: '', sku: '', precio: '', stock: '' };

export default function CatalogSection() {
  const { user } = useAuth();
  const isAdmin = (user?.roles || []).includes('Admin');
  const { medicamentos, loading, createMedicamento, updateMedicamento } = useCatalog();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sort, setSort] = useState('relevancia');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [nuevo, setNuevo] = useState(EMPTY_FORM);
  const [createError, setCreateError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  // Se busca en el catálogo vivo para que el detalle refleje el stock actualizado.
  const selectedProduct = medicamentos.find((m) => m.id === selectedId) || null;

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    const result = medicamentos.filter((m) => {
      const matchesSearch =
        !term || m.nombre.toLowerCase().includes(term) || m.sku.toLowerCase().includes(term);
      const matchesMin = !minPrice || m.precio >= Number(minPrice);
      const matchesMax = !maxPrice || m.precio <= Number(maxPrice);
      const matchesStock = !onlyAvailable || m.stock > 0;
      return matchesSearch && matchesMin && matchesMax && matchesStock;
    });
    return SORTERS[sort] ? [...result].sort(SORTERS[sort]) : result;
  }, [medicamentos, debouncedSearch, minPrice, maxPrice, onlyAvailable, sort]);

  const hasFilters = search || minPrice || maxPrice || onlyAvailable;

  const clearFilters = () => {
    setSearch('');
    setMinPrice('');
    setMaxPrice('');
    setOnlyAvailable(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    try {
      await createMedicamento({
        nombre: nuevo.nombre,
        sku: nuevo.sku,
        precio: Number(nuevo.precio),
        stock: Number(nuevo.stock),
      });
      setNuevo(EMPTY_FORM);
      setIsCreateOpen(false);
    } catch (err) {
      setCreateError(apiErrorMessage(err, 'No se pudo crear el medicamento.'));
    }
  };

  return (
    <section id="catalogo" className={styles.section} aria-labelledby="catalogo-title">
      <div className={styles.head}>
        <div>
          <h2 id="catalogo-title" className={styles.title}>
            Catálogo
          </h2>
          <p className={styles.lead}>
            {loading
              ? 'Cargando medicamentos…'
              : `${medicamentos.length} medicamentos para comprar en línea y retirar en farmacia.`}
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
            <Plus size={18} /> Añadir medicamento
          </button>
        )}
      </div>

      <div className={styles.toolbar} role="search">
        <label className={styles.search}>
          <Search size={19} aria-hidden="true" />
          <span className="visually-hidden">Buscar medicamento</span>
          <input
            type="search"
            placeholder="Buscar por nombre o código"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <div className={styles.price}>
          <label>
            <span className="visually-hidden">Precio mínimo</span>
            <input
              className="input"
              type="number"
              min="0"
              placeholder="Desde $"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
          </label>
          <label>
            <span className="visually-hidden">Precio máximo</span>
            <input
              className="input"
              type="number"
              min="0"
              placeholder="Hasta $"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </label>
        </div>

        <label className={`${styles.chip} ${onlyAvailable ? styles.chipOn : ''}`}>
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => setOnlyAvailable(e.target.checked)}
          />
          Solo disponibles
        </label>

        <label className={styles.sort}>
          <span className="visually-hidden">Ordenar</span>
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="relevancia">Orden sugerido</option>
            <option value="precio-asc">Menor precio</option>
            <option value="precio-desc">Mayor precio</option>
            <option value="nombre">Nombre A–Z</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className={styles.grid} aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <p>
            {search
              ? `Ningún medicamento coincide con “${search}”.`
              : 'Ningún medicamento coincide con estos filtros.'}
          </p>
          {hasFilters && (
            <button className="btn btn-outline btn-sm" onClick={clearFilters}>
              Quitar filtros
            </button>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((medicamento) => (
            <ProductCard
              key={medicamento.id}
              medicamento={medicamento}
              isAdmin={isAdmin}
              onSave={updateMedicamento}
              onViewDetail={(m) => setSelectedId(m.id)}
            />
          ))}
        </div>
      )}

      <ProductDetailModal
        key={selectedId}
        medicamento={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedId(null)}
      />

      {isAdmin && (
        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Nuevo medicamento">
          <form onSubmit={handleCreate} className={styles.form}>
            <label className="field">
              Nombre y dosis
              <input
                className="input"
                placeholder="Paracetamol 500mg"
                value={nuevo.nombre}
                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                required
              />
            </label>
            <label className="field">
              Código (SKU)
              <input
                className="input"
                placeholder="MED-007"
                value={nuevo.sku}
                onChange={(e) => setNuevo({ ...nuevo, sku: e.target.value })}
                required
              />
            </label>
            <div className={styles.formRow}>
              <label className="field">
                Precio
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={nuevo.precio}
                  onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value })}
                  required
                />
              </label>
              <label className="field">
                Stock inicial
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={nuevo.stock}
                  onChange={(e) => setNuevo({ ...nuevo, stock: e.target.value })}
                  required
                />
              </label>
            </div>
            {createError && (
              <p className="alert alert-error" role="alert">
                {createError}
              </p>
            )}
            <button type="submit" className="btn btn-primary btn-block">
              Crear medicamento
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
