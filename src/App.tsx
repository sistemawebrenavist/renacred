import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

// Páginas
import Login from './pages/Login';
import Home from './pages/Home';
import DashboardCliente from './pages/assinante/DashboardCliente';
import ConsultarImobiliario from './pages/assinante/ConsultarImobiliario';
import ExtratoFinanceiro from './pages/assinante/ExtratoFinanceiro';
import GerenciarApi from './pages/assinante/GerenciarApi';
import PortalDevDocs from './pages/assinante/PortalDevDocs';

// Admin
import DashboardAdmin from './pages/admin/DashboardAdmin';
import GerenciarClientes from './pages/admin/GerenciarClientes';
import ConsultaSuperAdmin from './pages/admin/ConsultaSuperAdmin';
import LogsApi from './pages/admin/LogsApi';

// Componentes de Proteção de Rota
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080e1a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user || !user.isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* Rotas Protegidas do Cliente */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardCliente />} />
          <Route path="/painel" element={<Navigate to="/dashboard" replace />} />
          <Route path="/consultar" element={<ConsultarImobiliario />} />
          <Route path="/extrato" element={<ExtratoFinanceiro />} />
          <Route path="/api-keys" element={<GerenciarApi />} />
          <Route path="/docs" element={<PortalDevDocs />} />
          <Route path="/pagamento/sucesso" element={<Navigate to="/extrato" replace />} />

          {/* Rotas Administrativas */}
          <Route
            path="/admin"
            element={
              <SuperAdminRoute>
                <DashboardAdmin />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/admin/clientes"
            element={
              <SuperAdminRoute>
                <GerenciarClientes />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/admin/consulta"
            element={
              <SuperAdminRoute>
                <ConsultaSuperAdmin />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <SuperAdminRoute>
                <LogsApi />
              </SuperAdminRoute>
            }
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
