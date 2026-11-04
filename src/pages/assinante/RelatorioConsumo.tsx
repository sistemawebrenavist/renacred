import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import ExtratoConsumoView from '../../components/common/ExtratoConsumoView';
import { useAuth } from '../../contexts/AuthContext';

export default function RelatorioConsumo() {
  const { user } = useAuth();
  const company = user?.company;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header do Relatório */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <FileSpreadsheet className="w-4 h-4 text-[#1D4ED8]" />
            <span>Faturamento & Auditoria de Consumo</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Relatório de Consumo & Consultas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Acompanhe o extrato detalhado de consultas tarifadas, falhas técnicas e exporte relatórios oficiais em Excel (.xlsx) e CSV.
          </p>
        </div>

        {company && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-left md:text-right shrink-0">
            <span className="text-slate-400 block text-[11px] font-medium">Empresa Titular</span>
            <span className="font-bold text-slate-900 block truncate max-w-[260px]" title={company.razaoSocial || company.nomeFantasia}>
              {company.razaoSocial || company.nomeFantasia || 'Minha Organização'}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Vencimento: Dia {company.billingDueDate || 10}
            </span>
          </div>
        )}
      </div>

      {/* Visão do Extrato de Consumo com KPIs, Filtros de Ciclo e Exportação */}
      <ExtratoConsumoView />
    </div>
  );
}
