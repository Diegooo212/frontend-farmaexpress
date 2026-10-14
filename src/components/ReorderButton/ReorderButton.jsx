import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useCatalog } from '../../context/CatalogContext';

// "Volver a comprar": agrega al carrito los productos de un pedido anterior,
// con el precio y el stock de hoy, y abre el carrito.
export default function ReorderButton({ pedido, className = 'btn btn-outline btn-sm' }) {
  const { addItem, items, abrirCarrito } = useCart();
  const { medicamentos } = useCatalog();
  const [aviso, setAviso] = useState('');

  const volverAComprar = () => {
    const faltantes = [];
    let agregados = 0;
    pedido.items.forEach((item) => {
      const medicamento = medicamentos.find((m) => m.id === item.id);
      const enCarrito = items.find((i) => i.id === item.id)?.cantidad || 0;
      const disponible = medicamento ? Math.max(0, medicamento.stock - enCarrito) : 0;
      if (disponible <= 0) {
        faltantes.push(item.nombre);
        return;
      }
      if (disponible < item.cantidad) faltantes.push(`${item.nombre} (solo ${disponible})`);
      addItem(medicamento, Math.min(item.cantidad, disponible), { silencioso: true });
      agregados += 1;
    });

    setAviso(faltantes.length ? `Sin stock suficiente: ${faltantes.join(', ')}.` : '');
    if (agregados > 0) abrirCarrito();
  };

  return (
    <>
      <button type="button" className={className} onClick={volverAComprar}>
        <RotateCcw size={16} /> Volver a comprar
      </button>
      {aviso && (
        <p className="alert alert-info" role="status">
          {aviso}
        </p>
      )}
    </>
  );
}
