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
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">{title || 'Painel Renacred'}</h2>
      </div>

      <div className="flex items-center space-x-3">
        {/* Badge Financeiro */}
        {isPrePaid ? (
          <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-xs">
            <div className="flex items-center text-xs font-medium text-slate-600">
              <Wallet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              <span className="text-slate-500">Saldo:</span>
              <span className="ml-1.5 text-sm font-bold text-emerald-700 font-mono">
                R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <Link
              to="/extrato"
              className="inline-flex items-center text-xs font-medium text-white bg-[#1D4ED8] hover:bg-[#1E40AF] px-2.5 py-1 rounded-lg transition shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1" />
              Recarregar
            </Link>
          </div>
        ) : (
          <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-xs">
            <div className="flex items-center text-xs font-medium text-slate-700">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-[#1D4ED8]" />
              <span className="text-slate-500">Faturamento pós-pago:</span>
              <span className="ml-1 text-slate-900 font-semibold">Venc. dia {company?.billingDueDate || 10}</span>
            </div>
            {company?.creditLimit && company.creditLimit > 0 && (
              <span className="text-xs text-slate-600 border-l border-slate-200 pl-2 font-mono">
                Limite: R$ {company.creditLimit.toFixed(2)}
              </span>
            )}
          </div>
        )}

        {/* Indicador de SuperAdmin */}
        {user?.isSuperAdmin && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200/80">
            <ShieldAlert className="w-3 h-3 mr-1 text-amber-700" />
            ADMIN MASTER
          </span>
        )}
      </div>
    </header>
  );
};
