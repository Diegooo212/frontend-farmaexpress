import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home/Home';
import Catalog from './pages/Catalog/Catalog';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Prescriptions from './pages/Prescriptions/Prescriptions';
import MyPrescriptions from './pages/MyPrescriptions/MyPrescriptions';
import Checkout from './pages/Checkout/Checkout';
import PaymentResult from './pages/PaymentResult/PaymentResult';
import PaymentSimulator from './pages/PaymentSimulator/PaymentSimulator';
import MyOrders from './pages/MyOrders/MyOrders';
import Inventory from './pages/Inventory/Inventory';
import PaymentProviders from './pages/PaymentProviders/PaymentProviders';
import RabbitAdmin from './pages/RabbitAdmin/RabbitAdmin';
import KafkaAdmin from './pages/KafkaAdmin/KafkaAdmin';
import Analytics from './pages/Analytics/Analytics';
import OrderDetail from './pages/OrderDetail/OrderDetail';
import OrdersPanel from './pages/OrdersPanel/OrdersPanel';
import Receipt from './pages/Receipt/Receipt';
import Account from './pages/Account/Account';
import Help from './pages/Info/Help';
import Terms from './pages/Info/Terms';
import Privacy from './pages/Info/Privacy';
import NotFound from './pages/NotFound/NotFound';
import Favorites from './pages/Favorites/Favorites';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import Shell from './components/Layout/Shell';
import PublicLayout from './components/Layout/PublicLayout';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';

const STAFF_ROLES = ['Operador', 'Admin'];
const ADMIN_ROLES = ['Admin'];

const conSesion = (pagina) => (
  <ProtectedRoute>
    <PublicLayout>{pagina}</PublicLayout>
  </ProtectedRoute>
);

const panel = (pagina, roles = STAFF_ROLES) => (
  <ProtectedRoute roles={roles}>
    <Shell>{pagina}</Shell>
  </ProtectedRoute>
);

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Login mode="registro" />} />
        {/* La recuperación de contraseña la ofrece la página de inicio de sesión de Entra ID. */}
        <Route path="/recuperar-password" element={<Navigate to="/login" replace />} />
        <Route path="/catalogo" element={<PublicLayout><Catalog /></PublicLayout>} />
        <Route path="/ayuda" element={<PublicLayout><Help /></PublicLayout>} />
        <Route path="/terminos" element={<PublicLayout><Terms /></PublicLayout>} />
        <Route path="/privacidad" element={<PublicLayout><Privacy /></PublicLayout>} />

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

        {/* Compra: checkout, vuelta desde el proveedor de pago y pedidos. */}
        <Route path="/checkout" element={conSesion(<Checkout />)} />
        <Route path="/pago/resultado" element={conSesion(<PaymentResult />)} />
        <Route path="/mi-cuenta" element={conSesion(<Account />)} />
        <Route path="/favoritos" element={conSesion(<Favorites />)} />
        <Route path="/mis-pedidos" element={conSesion(<MyOrders />)} />
        <Route path="/mis-pedidos/:id" element={conSesion(<OrderDetail />)} />
        {/* Sin encabezado ni pie: es una hoja para imprimir. */}
        <Route
          path="/mis-pedidos/:id/comprobante"
          element={
            <ProtectedRoute>
              <Receipt />
            </ProtectedRoute>
          }
        />
        {/* Simulador de pasarela (proveedores sin credenciales): se muestra como la página del proveedor. */}
        <Route path="/pago/confirmar" element={<PaymentSimulator />} />
        <Route path="/pago/simulador" element={<PaymentSimulator />} />

        <Route path="/pedidos" element={panel(<OrdersPanel />)} />
        <Route path="/inventario" element={panel(<Inventory />)} />
        <Route path="/medios-de-pago" element={panel(<PaymentProviders />, ADMIN_ROLES)} />
        <Route path="/rabbitmq" element={panel(<RabbitAdmin />, ADMIN_ROLES)} />
        <Route path="/kafka" element={panel(<KafkaAdmin />, ADMIN_ROLES)} />
        <Route path="/analitica" element={panel(<Analytics />)} />

        <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
      </Routes>
    </>
  );
}