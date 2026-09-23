import { useEffect } from 'react';

// Cierra con Escape y bloquea el scroll de la página mientras un diálogo está abierto.
export function useDialog(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);
}
