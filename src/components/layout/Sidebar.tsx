import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Search, 
  Wallet, 
  KeyRound, 
  FileCode2, 
  ShieldCheck, 
  Users, 
  Activity, 
  LayoutDashboard,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { RenacredLogo } from '../ui/RenacredLogo';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const clientLinks = [
    { to: '/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { to: '/consultar', label: 'Consultar Imóvel', icon: Search },
    { to: '/extrato', label: 'Extrato & Saldo', icon: Wallet },
    { to: '/api-keys', label: 'Chaves de Acesso', icon: KeyRound },
    { to: '/docs', label: 'Guia de Integração', icon: FileCode2, highlight: true },
  ];

  const adminLinks = [
    { to: '/admin', label: 'Painel Geral', icon: ShieldCheck },
    { to: '/admin/clientes', label: 'Clientes', icon: Users },
    { to: '/admin/consulta', label: 'Consulta Avulsa', icon: Search },
    { to: '/admin/logs', label: 'Histórico de Consultas', icon: Activity },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 select-none shadow-xs">
      {/* Brand Header com Logo Oficial */}
      <div className="px-5 py-6 border-b border-slate-100 flex items-center justify-center">
        <RenacredLogo size="md" badge={false} />
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Menu
          </p>
          <nav className="space-y-1">
            {clientLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-[#1D4ED8] font-semibold border border-blue-200/60 shadow-xs'
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

        {/* Admin Navigation */}
        {user?.isSuperAdmin && (
          <div className="pt-4 border-t border-slate-100">
            <p className="px-3 text-[11px] font-semibold text-amber-800 uppercase tracking-wider mb-2 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-amber-700" />
              Administração
            </p>
            <nav className="space-y-1">
              {adminLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-amber-50 text-amber-900 font-semibold border border-amber-200/60 shadow-xs'
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
        )}
      </div>

      {/* User / Logout Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="overflow-hidden mr-2">
            <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.company?.razaoSocial}</p>
          </div>
          <button
            onClick={logout}
            title="Encerrar sessão"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
