import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  Search,
  LayoutGrid,
  KeyRound, 
  FileCode2, 
  ShieldCheck, 
  Users, 
  Activity, 
  LayoutDashboard,
  Settings,
  CreditCard,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { RenacredLogo } from '../ui/RenacredLogo';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const isSuperAdmin = !!user?.isSuperAdmin;

  // Navegação de Consultas & Catálogo Oficial (Unificado)
  const productLinks = [
    { 
      to: '/consultar', 
      label: 'Consultar', 
      icon: Search, 
      badge: null,
      badgeColor: ''
    },
    { 
      to: '/produtos', 
      label: 'Catálogo de Produtos', 
      icon: LayoutGrid, 
      badge: '16',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200'
    },
  ];

  // Menu do Portal de Gestão (Wellington / Admin)
  const adminManagementLinks = [
    { to: '/admin/clientes', label: 'Clientes & Tarifas', icon: Users },
    { to: '/admin/logs', label: 'Auditoria de API', icon: Activity },
    { to: '/admin/configuracoes', label: 'Configurações Globais', icon: Settings },
  ];

  // Menu do Portal do Assinante (Empresas Clientes)
  const clientManagementLinks = [
    { to: '/minha-assinatura', label: 'Minha Assinatura', icon: CreditCard },
    { to: '/api-keys', label: 'Chaves de Acesso', icon: KeyRound },
    { to: '/docs', label: 'Guia de Integração', icon: FileCode2 },
    { to: '/configuracoes', label: 'Configurações', icon: Settings },
  ];

  const managementLinks = isSuperAdmin ? adminManagementLinks : clientManagementLinks;
  const sectionTitle = isSuperAdmin ? 'Portal de Gestão' : 'Portal do Assinante';

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 select-none shadow-xs">
      {/* Brand Header com Logo Oficial */}
      <div className="px-5 py-6 border-b border-slate-100 flex items-center justify-center">
        <RenacredLogo size="md" badge={false} />
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Visão Geral */}
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center">
            {isSuperAdmin && <ShieldCheck className="w-3.5 h-3.5 mr-1 text-amber-700" />}
            {sectionTitle}
          </p>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                isActive
                  ? isSuperAdmin
                    ? 'bg-amber-50 text-amber-900 font-semibold border border-amber-200/60 shadow-xs'
                    : 'bg-blue-50 text-[#1D4ED8] font-semibold border border-blue-200/60 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4 mr-3 shrink-0" />
            <span>Visão Geral</span>
          </NavLink>
        </div>

        {/* Catálogo de Produtos Oficiais */}
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Bases Oficiais & Consultas
          </p>
          <nav className="space-y-1">
            {productLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-[#1D4ED8] font-semibold border border-blue-200/60 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <div className="flex items-center min-w-0">
                    <Icon className="w-4 h-4 mr-3 shrink-0 text-slate-500" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Gestão / Ferramentas */}
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            {isSuperAdmin ? 'Administração' : 'Gestão & Contrato'}
          </p>
          <nav className="space-y-1">
            {managementLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? isSuperAdmin
                          ? 'bg-amber-50 text-amber-900 font-semibold border border-amber-200/60 shadow-xs'
                          : 'bg-blue-50 text-[#1D4ED8] font-semibold border border-blue-200/60 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 mr-3 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User / Logout Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <Link
            to={isSuperAdmin ? '/admin/configuracoes' : '/configuracoes'}
            title="Acessar configurações da conta"
            className="overflow-hidden mr-2 group flex-1"
          >
            <p className="text-xs font-bold text-slate-900 truncate group-hover:text-[#1D4ED8] transition">
              {user?.name || (isSuperAdmin ? 'Wellington' : 'Assinante')}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {user?.company?.razaoSocial || (isSuperAdmin ? 'Renacred Tecnologia' : 'Empresa')}
            </p>
          </Link>
          <div className="flex items-center space-x-1">
            <Link
              to={isSuperAdmin ? '/admin/configuracoes' : '/configuracoes'}
              title="Configurações da conta"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
            >
              <Settings className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={logout}
              title="Encerrar sessão"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
