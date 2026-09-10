import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AuthProvider from './auth/AuthProvider';
import { AuthContextProvider } from './context/AuthContext';
import { CatalogProvider } from './context/CatalogContext';
import { CartProvider } from './context/CartContext';
import { PrescriptionsProvider } from './context/PrescriptionsContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <AuthContextProvider>
          <CatalogProvider>
            <PrescriptionsProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </PrescriptionsProvider>
          </CatalogProvider>
        </AuthContextProvider>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);