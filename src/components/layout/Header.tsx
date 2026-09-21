import React from 'react';
import { Link } from 'react-router-dom';
import { Wallet, PlusCircle, Calendar, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Header: React.FC<{ title?: string }> = ({ title }) => {
  const { user } = useAuth();
  const company = user?.company;

  const isPrePaid = company?.accountType === 'PRE_PAID';
  const balance = company?.creditsBalance || 0;

  return (
    <header className="h-16 bg-[#0b1325]/80 backdrop-blur-md border-b border-slate-800/80 px-8 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h2 className="text-lg font-semibold text-white">{title || 'Painel Renacred'}</h2>
      </div>

      <div className="flex items-center space-x-4">
        {/* Badge Financeiro */}
        {isPrePaid ? (
          <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-xl">
            <div className="flex items-center text-xs font-semibold text-slate-300">
              <Wallet className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              <span className="text-slate-400">Saldo:</span>
              <span className="ml-1.5 text-sm font-bold text-emerald-400 font-mono">
                R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <Link
              to="/extrato"
              className="inline-flex items-center text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded-lg transition shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1" />
              Recarregar
            </Link>
          </div>
        ) : (
          <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-xl">
            <div className="flex items-center text-xs font-semibold text-blue-400">
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              <span className="text-slate-400">Faturamento Pós-pago:</span>
              <span className="ml-1 text-xs text-slate-200">Venc. dia {company?.billingDueDate || 10}</span>
            </div>
            {company?.creditLimit && company.creditLimit > 0 && (
              <span className="text-xs text-slate-400 border-l border-slate-700 pl-2 font-mono">
                Limite: R$ {company.creditLimit.toFixed(2)}
              </span>
            )}
          </div>
        )}

        {/* Indicador de SuperAdmin */}
        {user?.isSuperAdmin && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <ShieldAlert className="w-3 h-3 mr-1" />
            ADMIN MASTER
          </span>
        )}
      </div>
    </header>
  );
};
