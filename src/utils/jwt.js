// Lee los claims de un JWT (solo para mostrarlos; quien valida la firma es el backend / API Gateway).
export function decodeJwt(token) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// "scp" viene como texto separado por espacios: "access_as_user otro.scope".
export const scopesDe = (claims) => (claims?.scp ? claims.scp.split(' ') : []);

// App Roles sin importar mayúsculas: "admin", "Admin" o "ADMIN" → "Admin" (igual que el backend).
const ROLES_CANONICOS = { admin: 'Admin', administrador: 'Admin', operador: 'Operador', cliente: 'Cliente' };
const normalizarRol = (rol) => ROLES_CANONICOS[String(rol).trim().toLowerCase()] || String(rol).trim();

export const rolesDe = (claims) => (Array.isArray(claims?.roles) ? [...new Set(claims.roles.map(normalizarRol))] : []);
