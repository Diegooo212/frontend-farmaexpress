import { Bandage, Flower2, Pill, ShieldPlus, Soup, Sparkles, Sun, Thermometer, Wind } from 'lucide-react';

// El catálogo guarda el nombre del ícono de cada categoría; aquí se traduce a un ícono de lucide.
const ICONOS = {
  thermometer: Thermometer,
  flower: Flower2,
  soup: Soup,
  sparkles: Sparkles,
  'shield-plus': ShieldPlus,
  wind: Wind,
  bandage: Bandage,
  sun: Sun,
};

export default function CategoryIcon({ icono, size = 22 }) {
  const Icono = ICONOS[icono] || Pill;
  return <Icono size={size} aria-hidden="true" />;
}
