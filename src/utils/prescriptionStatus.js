export const STATUS_LABELS = {
  INGRESADA: 'Ingresada',
  VALIDADA: 'Validada',
  EN_PREPARACION: 'En preparación',
  LISTA_RETIRO: 'Lista para retiro',
  DISPENSADA: 'Entregada',
  RECHAZADA: 'Rechazada',
};

// Recorrido normal de una receta (RECHAZADA queda fuera del flujo).
export const STATUS_FLOW = ['INGRESADA', 'VALIDADA', 'EN_PREPARACION', 'LISTA_RETIRO', 'DISPENSADA'];

export const NEXT_STATUS = {
  INGRESADA: 'VALIDADA',
  VALIDADA: 'EN_PREPARACION',
  EN_PREPARACION: 'LISTA_RETIRO',
  LISTA_RETIRO: 'DISPENSADA',
};

export const NEXT_LABEL = {
  INGRESADA: 'Validar receta',
  VALIDADA: 'Pasar a preparación',
  EN_PREPARACION: 'Marcar lista para retiro',
  LISTA_RETIRO: 'Marcar como entregada',
};

export const REJECTABLE = ['INGRESADA', 'VALIDADA'];

// Una receta pertenece a la cuenta que la envió. Las recetas antiguas, sin cuenta
// registrada, se asocian por nombre del paciente.
export function isOwnReceta(receta, user) {
  if (!user) return false;
  // Con backend, el dueño es el oid de Entra ID (cuentaId).
  if (receta.cuentaId) return receta.cuentaId === user.id;
  if (receta.cuentaEmail) {
    return receta.cuentaEmail.toLowerCase() === (user.email || '').toLowerCase();
  }
  return receta.pacienteNombre === user.nombre;
}

// Historial de la receta; las recetas antiguas solo tienen su estado actual.
export function getHistorial(receta) {
  if (receta.historial?.length) return receta.historial;
  return [{ status: receta.status, fecha: receta.fechaCreacion }];
}

export function lastNote(receta, status) {
  return [...getHistorial(receta)].reverse().find((h) => h.status === status && h.nota)?.nota;
}

// Texto que recibe el paciente cuando su receta cambia de estado.
export function patientMessage(receta, status) {
  switch (status) {
    case 'INGRESADA':
      return 'Recibimos tu receta.';
    case 'VALIDADA':
      return 'Un químico farmacéutico validó tu receta.';
    case 'EN_PREPARACION':
      return 'Estamos preparando tu receta.';
    case 'LISTA_RETIRO':
      return receta.metodoDespacho === 'DESPACHO_DOMICILIO'
        ? 'Tu receta está lista y saldrá a despacho.'
        : `Tu receta está lista para retiro en ${receta.farmacia || 'la farmacia'}.`;
    case 'DISPENSADA':
      return 'Tu receta fue entregada.';
    case 'RECHAZADA':
      return 'Tu receta fue rechazada.';
    default:
      return STATUS_LABELS[status] || status;
  }
}
