import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Eye } from 'lucide-react';
import { toast } from 'sonner';

export const AppLayout: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const hasAdminBackup = Boolean(localStorage.getItem('@renacred:admin_backup_token'));

  const handleExitSimulation = () => {
    const backupToken = localStorage.getItem('@renacred:admin_backup_token');
    const backupUser = localStorage.getItem('@renacred:admin_backup_user');
    if (backupToken && backupUser) {
      try {
        const parsedUser = JSON.parse(backupUser);
        localStorage.removeItem('@renacred:admin_backup_token');
        localStorage.removeItem('@renacred:admin_backup_user');
        login(backupToken, parsedUser);
        toast.info('Simulação finalizada. Retornado ao painel de administração.');
        navigate('/admin/clientes');
      } catch (e) {
        window.location.reload();
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 print:bg-white print:block">
      {hasAdminBackup && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs z-50 print:hidden">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-slate-950 animate-pulse" />
            <Eye className="w-4 h-4 text-slate-950" />
            <span>
              Modo de Simulação Ativo: Visualizando plataforma como <strong>{user?.company?.razaoSocial}</strong> (Produtos: {user?.company?.allowedProducts?.includes('ALL') ? 'Todos' : user?.company?.allowedProducts?.length || 0})
            </span>
          </div>
          <button
            onClick={handleExitSimulation}
            className="px-3 py-1 bg-slate-950 text-white rounded-md hover:bg-slate-800 transition text-xs font-bold cursor-pointer flex items-center space-x-1"
          >
            <LogOut className="w-3 h-3" />
            <span>Sair da Simulação (Voltar ao SuperAdmin)</span>
          </button>
        </div>
      )}
      <div className="flex flex-1 min-w-0">
        <div className="print:hidden">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0 print:block print:w-full">
          <div className="print:hidden">
            <Header />
          </div>
          <main className="flex-1 p-8 overflow-y-auto print:p-0 print:m-0 print:overflow-visible print:w-full print:max-w-none">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
