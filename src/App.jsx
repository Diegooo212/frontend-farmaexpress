import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home/Home';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Prescriptions from './pages/Prescriptions/Prescriptions';
import MyPrescriptions from './pages/MyPrescriptions/MyPrescriptions';
import MyAccount from './pages/MyAccount/MyAccount';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import Shell from './components/Layout/Shell';
import PublicLayout from './components/Layout/PublicLayout';

const STAFF_ROLES = ['Operador', 'Admin'];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Login mode="registro" />} />
      {/* La recuperación de contraseña la ofrece la página de inicio de sesión de Entra ID. */}
      <Route path="/recuperar-password" element={<Navigate to="/login" replace />} />
      <Route path="/catalogo" element={<Navigate to={{ pathname: '/', hash: '#catalogo' }} replace />} />

      <Route
        path="/mis-recetas"
        element={
          <ProtectedRoute>
            <PublicLayout>
              <MyPrescriptions />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/mi-cuenta"
        element={
          <ProtectedRoute>
            <PublicLayout>
              <MyAccount />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={STAFF_ROLES}>
            <Shell>
              <Dashboard />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recetas"
        element={
          <ProtectedRoute roles={STAFF_ROLES}>
            <Shell>
              <Prescriptions />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}