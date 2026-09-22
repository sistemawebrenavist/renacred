import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

// Páginas do Assinante / Geral
import Login from './pages/Login';
import Home from './pages/Home';
import DashboardCliente from './pages/assinante/DashboardCliente';
import ConsultarImobiliario from './pages/assinante/ConsultarImobiliario';
import MinhaAssinatura from './pages/assinante/MinhaAssinatura';
import GerenciarApi from './pages/assinante/GerenciarApi';
import PortalDevDocs from './pages/assinante/PortalDevDocs';
import ConfiguracoesCliente from './pages/assinante/ConfiguracoesCliente';

// Páginas Administrativas (Wellington)
import DashboardAdmin from './pages/admin/DashboardAdmin';
import GerenciarClientes from './pages/admin/GerenciarClientes';
import LogsApi from './pages/admin/LogsApi';
import ConfiguracoesAdmin from './pages/admin/ConfiguracoesAdmin';

// Componente Dinâmico de Visão Geral (SuperAdmin -> DashboardAdmin / Cliente -> DashboardCliente)
const UnifiedDashboard: React.FC = () => {
  const { user } = useAuth();
  if (user?.isSuperAdmin) {
    return <DashboardAdmin />;
  }
  return <DashboardCliente />;
};

// Componentes de Proteção de Rota
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1D4ED8] border-t-transparent rounded-full animate-spin" />
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

        {/* Rotas Autenticadas */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Visão Geral (Renderização condicional por perfil) */}
          <Route path="/dashboard" element={<UnifiedDashboard />} />
          <Route path="/painel" element={<Navigate to="/dashboard" replace />} />
          <Route path="/admin" element={<Navigate to="/dashboard" replace />} />

          {/* Consulta de Imóvel Unificada */}
          <Route path="/consultar" element={<ConsultarImobiliario />} />
          <Route path="/admin/consulta" element={<Navigate to="/consultar" replace />} />

          {/* Módulos do Assinante */}
          <Route path="/minha-assinatura" element={<MinhaAssinatura />} />
          <Route path="/extrato" element={<Navigate to="/minha-assinatura" replace />} />
          <Route path="/api-keys" element={<GerenciarApi />} />
          <Route path="/docs" element={<PortalDevDocs />} />
          <Route path="/configuracoes" element={<ConfiguracoesCliente />} />
          <Route path="/pagamento/sucesso" element={<Navigate to="/minha-assinatura?paid=true" replace />} />

          {/* Módulos Exclusivos do Super Admin (Wellington) */}
          <Route
            path="/admin/clientes"
            element={
              <SuperAdminRoute>
                <GerenciarClientes />
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
          <Route
            path="/admin/configuracoes"
            element={
              <SuperAdminRoute>
                <ConfiguracoesAdmin />
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
