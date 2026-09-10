import { createContext, useContext, useState } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';

const AuthContext = createContext(null);
const USERS_KEY = 'farmaexpress_mock_users';
const SESSION_KEY = 'farmaexpress_mock_session';

function getStoredUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function AuthContextProvider({ children }) {
  const msalIsAuthenticated = useIsAuthenticated();
  const { accounts, instance } = useMsal();

  const [localUser, setLocalUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch {
      return null;
    }
  });

  const register = ({ nombre, email, password, rol }) => {
    const users = getStoredUsers();
    if (users.some((u) => u.email === email)) {
        throw new Error('Ya existe una cuenta con ese correo.');
    }
    const newUser = { nombre, email, password, roles: [rol || 'Cliente'] };
    saveStoredUsers([...users, newUser]);
    return newUser;
    };

  const login = ({ email, password }) => {
    const users = getStoredUsers();
    const found = users.find((u) => u.email === email && u.password === password);
    if (!found) {
      throw new Error('Correo o contraseña incorrectos.');
    }
    const session = { nombre: found.nombre, email: found.email, roles: found.roles };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setLocalUser(session);
    return session;
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setLocalUser(null);
    if (msalIsAuthenticated) {
      instance.logoutRedirect();
    }
  };

  const azureUser = msalIsAuthenticated
    ? {
        nombre: accounts[0]?.name,
        email: accounts[0]?.username,
        roles: accounts[0]?.idTokenClaims?.roles || [],
      }
    : null;

  const user = azureUser || localUser;
  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthContextProvider');
  return ctx;
}