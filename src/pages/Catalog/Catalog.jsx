import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, Search, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { useDebounce } from '../../hooks/useDebounce';
import CategoryIcon from '../../components/CategoryIcon/CategoryIcon';
import ProductForm from '../../components/ProductForm/ProductForm';
import ProductCard from '../../components/ProductCard/ProductCard';
import ProductDetailModal from '../../components/ProductDetailModal/ProductDetailModal';
import Pagination from '../../components/Pagination/Pagination';
import styles from './Catalog.module.css';

const SORTERS = {
  relevancia: null,
  'precio-asc': (a, b) => a.precio - b.precio,
  'precio-desc': (a, b) => b.precio - a.precio,
  nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
};

// Productos por página: 24 llena filas completas con 2, 3 o 4 columnas.
const POR_PAGINA = 24;

export default function Catalog() {
  const { user } = useAuth();
  const isAdmin = (user?.roles || []).includes('Admin');
  const { medicamentos, categorias, loading, usingMock, refresh, createMedicamento, updateMedicamento, deleteMedicamento } =
    useCatalog();
  // La categoría va en la URL (/catalogo?categoria=alergias) para poder enlazarla desde el inicio.
  const [params, setParams] = useSearchParams();
  const categoriaSlug = params.get('categoria') || '';
  const categoria = categorias.find((c) => c.slug === categoriaSlug) || null;
  const elegirCategoria = (slug) => {
    const siguientes = new URLSearchParams(params);
    if (slug) siguientes.set('categoria', slug);
    else siguientes.delete('categoria');
    setParams(siguientes, { replace: true });
  };
  const [ventaLibre, setVentaLibre] = useState(false);
  // Búsqueda que llega por la URL (/catalogo?q=paracetamol), por ejemplo desde la página 404.
  const [search, setSearch] = useState(() => params.get('q') || '');


  const debouncedSearch = useDebounce(search, 300);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sort, setSort] = useState('relevancia');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  // Se busca en el catálogo vivo para que el detalle refleje el stock actualizado.
  const selectedProduct = medicamentos.find((m) => m.id === selectedId) || null;

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    const result = medicamentos.filter((m) => {
      // Se busca por nombre, código, principio activo o laboratorio.
      const matchesSearch =
        !term ||
        [m.nombre, m.sku, m.principioActivo, m.laboratorio].some((v) => v && v.toLowerCase().includes(term));
      const matchesCategoria = !categoriaSlug || m.categoriaSlug === categoriaSlug;
      const matchesReceta = !ventaLibre || !m.requiereReceta;
      const matchesMin = !minPrice || m.precio >= Number(minPrice);
      const matchesMax = !maxPrice || m.precio <= Number(maxPrice);
      const matchesStock = !onlyAvailable || m.stock > 0;
      return matchesSearch && matchesCategoria && matchesReceta && matchesMin && matchesMax && matchesStock;
    });
    return SORTERS[sort] ? [...result].sort(SORTERS[sort]) : result;
  }, [medicamentos, debouncedSearch, categoriaSlug, ventaLibre, minPrice, maxPrice, onlyAvailable, sort]);

  // Paginación: al buscar, filtrar u ordenar se vuelve a la primera página.
  const [pagina, setPagina] = useState(1);
  const claveFiltros = `${debouncedSearch}|${categoriaSlug}|${ventaLibre}|${minPrice}|${maxPrice}|${onlyAvailable}|${sort}`;
  const [claveAnterior, setClaveAnterior] = useState(claveFiltros);
  if (claveAnterior !== claveFiltros) {
    setClaveAnterior(claveFiltros);
    setPagina(1);
  }
  const totalPaginas = Math.max(1, Math.ceil(filtered.length / POR_PAGINA));
  // Si el catálogo se achica (p. ej. al filtrar), la página no puede quedar fuera de rango.
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * POR_PAGINA;
  const visibles = filtered.slice(desde, desde + POR_PAGINA);

  const irAPagina = (numero) => {
    setPagina(numero);
    document.getElementById('catalogo')?.scrollIntoView();
  };

  const hasFilters = search || categoriaSlug || ventaLibre || minPrice || maxPrice || onlyAvailable;

  const clearFilters = () => {
    setSearch('');
    setMinPrice('');
    setMaxPrice('');
    setOnlyAvailable(false);
    setVentaLibre(false);
    elegirCategoria('');
  };

  return (
    <section id="catalogo" className={styles.section} aria-labelledby="catalogo-title">
      <div className={styles.head}>
        <div>
          <h1 id="catalogo-title" className={styles.title}>
            {categoria ? categoria.nombre : 'Catálogo'}
          </h1>
          <p className={styles.lead}>
            {loading
              ? 'Cargando productos…'
              : categoria
                ? categoria.descripcion
                : `${medicamentos.length} productos para comprar en línea y retirar en farmacia o recibir en tu casa.`}
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
            <Plus size={18} /> Añadir producto
          </button>
        )}
      </div>

      {usingMock && (
        <div className={`alert alert-error ${styles.sinConexion}`} role="alert">
          <span>
            No pudimos conectar con FarmaExpress. Te mostramos el último catálogo disponible: los precios y el stock
            pueden no estar actualizados.
          </span>
          <button className="btn btn-outline btn-sm" onClick={refresh}>
            Reintentar
          </button>
        </div>
      )}

      {categorias.length > 0 && (
        <nav className={styles.categorias} aria-label="Categorías">
          <button
            type="button"
            className={`${styles.categoria} ${!categoriaSlug ? styles.categoriaActiva : ''}`}
            onClick={() => elegirCategoria('')}
            aria-pressed={!categoriaSlug}
          >
            <LayoutGrid size={20} aria-hidden="true" />
            <span>Todo</span>
          </button>
          {categorias.map((c) => (
            <button
              key={c.slug}
              type="button"
              className={`${styles.categoria} ${categoriaSlug === c.slug ? styles.categoriaActiva : ''}`}
              onClick={() => elegirCategoria(c.slug)}
              aria-pressed={categoriaSlug === c.slug}
            >
              <CategoryIcon icono={c.icono} size={20} />
              <span>{c.nombre}</span>
              <small>{c.productos}</small>
            </button>
          ))}
        </nav>
      )}

      <div className={styles.toolbar} role="search">
        <label className={styles.search}>
          <Search size={19} aria-hidden="true" />
          <span className="visually-hidden">Buscar medicamento</span>
          <input
            type="search"
            placeholder="Buscar por nombre, principio activo o laboratorio"
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

        <label className={`${styles.chip} ${ventaLibre ? styles.chipOn : ''}`}>
          <input type="checkbox" checked={ventaLibre} onChange={(e) => setVentaLibre(e.target.checked)} />
          Venta libre (sin receta)
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
        <>
          <div className={styles.grid}>
            {visibles.map((medicamento) => (
              <ProductCard
                key={medicamento.id}
                medicamento={medicamento}
                isAdmin={isAdmin}
                onSave={updateMedicamento}
                onDelete={deleteMedicamento}
                onViewDetail={(m) => setSelectedId(m.id)}
              />
            ))}
          </div>

          <div className={styles.paginacion}>
            <p className={styles.rango} aria-live="polite">
              Mostrando {desde + 1}–{desde + visibles.length} de {filtered.length} productos
            </p>
            <Pagination
              pagina={paginaActual}
              totalPaginas={totalPaginas}
              onCambiar={irAPagina}
              etiqueta="Páginas del catálogo"
            />
          </div>
        </>
      )}

      <ProductDetailModal
        key={selectedId}
        medicamento={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedId(null)}
      />

      {isAdmin && (
        <ProductForm
          key={isCreateOpen ? 'nuevo-abierto' : 'nuevo-cerrado'}
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          medicamento={null}
          categorias={categorias}
          onGuardar={(datos) => createMedicamento({ ...datos, stock: 0 })}
        />
      )}
    </section>
  );
}
