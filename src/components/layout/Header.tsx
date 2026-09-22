import React from 'react';
import { Link } from 'react-router-dom';
import { Wallet, PlusCircle, Calendar, ShieldCheck, Settings, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Header: React.FC<{ title?: string }> = ({ title }) => {
  const { user } = useAuth();
  const company = user?.company;
  const isSuperAdmin = !!user?.isSuperAdmin;

  const isPrePaid = company?.accountType === 'PRE_PAID';
  const balance = company?.creditsBalance || 0;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          {title || (isSuperAdmin ? 'Painel de Gestão Renacred' : 'Painel Renacred')}
        </h2>
      </div>

      <div className="flex items-center space-x-3">
        {/* Badge Financeiro Exclusivo do Assinante */}
        {!isSuperAdmin && (
          <>
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
                  to="/minha-assinatura"
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
                  <span className="text-slate-500">Pós-pago:</span>
                  <span className="ml-1 text-slate-900 font-semibold">Vencimento dia {company?.billingDueDate || 10}</span>
                </div>
                {company?.creditLimit && company.creditLimit > 0 && (
                  <span className="text-xs text-slate-600 border-l border-slate-200 pl-2">
                    Limite: {company.creditLimit >= 999999 ? 'Ilimitado' : `R$ ${company.creditLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  </span>
                )}
              </div>
            )}
          </>
        )}

        {/* Identificador do Administrador Wellington */}
        {isSuperAdmin && (
          <Link
            to="/admin/configuracoes"
            title="Acessar configurações da conta"
            className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100/80 transition shadow-xs"
          >
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            <span className="font-bold">{user?.name || 'Wellington'}</span>
            <span className="text-[10px] text-amber-700 font-medium px-1.5 py-0.5 bg-amber-100/80 rounded">
              Administrador
            </span>
          </Link>
        )}

        {/* Identificador do Assinante (ex: Marlon) */}
        {!isSuperAdmin && (
          <Link
            to="/configuracoes"
            title="Acessar configurações da conta"
            className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-200/80 hover:bg-blue-100/80 transition shadow-xs"
          >
            <User className="w-4 h-4 text-[#1D4ED8]" />
            <span className="font-bold text-slate-900">{user?.name || 'Assinante'}</span>
            <span className="text-[10px] text-[#1D4ED8] font-medium px-1.5 py-0.5 bg-blue-100/80 rounded">
              Assinante
            </span>
          </Link>
        )}
      </div>
    </header>
  );
};
