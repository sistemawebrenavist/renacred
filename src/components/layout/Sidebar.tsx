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
    { to: '/api-keys', label: 'Chaves de API', icon: KeyRound },
    { to: '/docs', label: 'Documentação API', icon: FileCode2, highlight: true },
  ];

  const adminLinks = [
    { to: '/admin', label: 'Painel Geral Admin', icon: ShieldCheck },
    { to: '/admin/clientes', label: 'Gestão de Clientes', icon: Users },
    { to: '/admin/consulta', label: 'Consulta Super Admin', icon: Search },
    { to: '/admin/logs', label: 'Logs da API', icon: Activity },
  ];

  return (
    <aside className="w-64 bg-[#0B1325] border-r border-[#1E293B] flex flex-col h-screen sticky top-0 select-none">
      {/* Brand Header com Logo Oficial */}
      <div className="p-4 border-b border-[#1E293B] flex flex-col items-center text-center">
        <RenacredLogo size="sm" className="mb-2" />
        <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
          Birô de Consultas Cartorárias
        </span>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        <div>
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Módulos de Consulta
          </p>
          <nav className="space-y-1">
            {clientLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    } ${item.highlight && !isActive ? 'text-blue-300' : ''}`
                  }
                >
                  <Icon className="w-4 h-4 mr-3 text-blue-400" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Admin Navigation */}
        {user?.isSuperAdmin && (
          <div className="pt-4 border-t border-[#1E293B]">
            <p className="px-3 text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-amber-400" />
              Gestão Corporativa
            </p>
            <nav className="space-y-1">
              {adminLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 mr-3 text-amber-400" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* User / Logout Footer */}
      <div className="p-4 border-t border-[#1E293B] bg-[#080E1A]/80">
        <div className="flex items-center justify-between">
          <div className="overflow-hidden mr-2">
            <p className="text-xs font-bold text-white truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.company?.razaoSocial}</p>
          </div>
          <button
            onClick={logout}
            title="Encerrar sessão"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
