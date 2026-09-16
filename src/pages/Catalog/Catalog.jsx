import { useMemo, useState } from 'react';
import { Pill } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { useDebounce } from '../../hooks/useDebounce';
import Modal from '../../components/Modal/Modal';
import ProductCard from '../../components/ProductCard/ProductCard';
import ProductDetailModal from '../../components/ProductDetailModal/ProductDetailModal';
import styles from './Catalog.module.css';

export default function Catalog() {
  const { user } = useAuth();
  const isAdmin = (user?.roles || []).includes('Admin');
  const { medicamentos, loading, createMedicamento, updateMedicamento } = useCatalog();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [hideOutOfStock, setHideOutOfStock] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: '', sku: '', precio: '', stock: '' });

  const [selectedProduct, setSelectedProduct] = useState(null);

  const filtered = useMemo(() => {
    return medicamentos.filter((m) => {
      const matchesSearch =
        !debouncedSearch ||
        m.nombre.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        m.sku.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesMin = !minPrice || m.precio >= Number(minPrice);
      const matchesMax = !maxPrice || m.precio <= Number(maxPrice);
      const matchesStock = !hideOutOfStock || m.stock > 0;
      return matchesSearch && matchesMin && matchesMax && matchesStock;
    });
  }, [medicamentos, debouncedSearch, minPrice, maxPrice, hideOutOfStock]);

  const handleCreate = async (e) => {
    e.preventDefault();
    await createMedicamento({
      nombre: nuevo.nombre,
      sku: nuevo.sku,
      precio: Number(nuevo.precio),
      stock: Number(nuevo.stock),
    });
    setNuevo({ nombre: '', sku: '', precio: '', stock: '' });
    setIsCreateOpen(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.banner}>
        <div className={styles.bannerIcon}>
          <Pill size={28} />
        </div>
        <div className={styles.bannerText}>
          <h1 className={styles.title}>Catálogo de medicamentos</h1>
          <p className={styles.bannerSubtitle}>Encuentra tus medicamentos y agrégalos al carrito</p>
        </div>
        {isAdmin && (
          <button className={styles.newButton} onClick={() => setIsCreateOpen(true)}>
            + Añadir medicamento
          </button>
        )}
      </div>

      <div className={styles.filters}>
        <input
          className={styles.searchInput}
          placeholder="Buscar por nombre o SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          className={styles.priceInput}
          type="number"
          placeholder="Precio mín."
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <input
          className={styles.priceInput}
          type="number"
          placeholder="Precio máx."
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={hideOutOfStock}
            onChange={(e) => setHideOutOfStock(e.target.checked)}
          />
          Ocultar sin stock
        </label>
      </div>

      {loading ? (
        <p className={styles.state}>Cargando medicamentos...</p>
      ) : (
        <div className={styles.grid}>
          {filtered.map((medicamento) => (
            <ProductCard
              key={medicamento.id}
              medicamento={medicamento}
              isAdmin={isAdmin}
              onSave={updateMedicamento}
              onViewDetail={setSelectedProduct}
            />
          ))}
          {filtered.length === 0 && (
            <p className={styles.empty}>No hay medicamentos para este filtro.</p>
          )}
        </div>
      )}

      <ProductDetailModal
        key={selectedProduct?.id}
        medicamento={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {isAdmin && (
        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Nuevo medicamento">
          <form onSubmit={handleCreate} className={styles.form}>
            <label className={styles.label}>
              SKU
              <input
                className={styles.input}
                value={nuevo.sku}
                onChange={(e) => setNuevo({ ...nuevo, sku: e.target.value })}
                required
              />
            </label>
            <label className={styles.label}>
              Nombre
              <input
                className={styles.input}
                value={nuevo.nombre}
                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                required
              />
            </label>
            <label className={styles.label}>
              Precio
              <input
                className={styles.input}
                type="number"
                value={nuevo.precio}
                onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value })}
                required
              />
            </label>
            <label className={styles.label}>
              Stock inicial
              <input
                className={styles.input}
                type="number"
                value={nuevo.stock}
                onChange={(e) => setNuevo({ ...nuevo, stock: e.target.value })}
                required
              />
            </label>
            <button type="submit" className={styles.submitButton}>
              Crear medicamento
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}