// App Roles del token sin importar mayúsculas: "admin", "Admin" o "Administrador" → "Admin" (igual que el backend).
const ROLES_CANONICOS = { admin: 'Admin', administrador: 'Admin', operador: 'Operador', cliente: 'Cliente' };
const normalizarRol = (rol) => ROLES_CANONICOS[String(rol).trim().toLowerCase()] || String(rol).trim();

export const rolesDe = (claims) => (Array.isArray(claims?.roles) ? [...new Set(claims.roles.map(normalizarRol))] : []);
