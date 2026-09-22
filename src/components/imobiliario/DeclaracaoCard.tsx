import React from 'react';
import { Building, Calendar, FileText, UserCheck, Users, Landmark, MapPin } from 'lucide-react';

interface Parte {
  nome: string;
  cpfCnpj: string;
}

export interface DeclaracaoProps {
  numDeclaracao?: string;
  nome?: string;
  tipoParte?: string;
  tipoDeclaracao?: string;
  matricula?: string;
  registro?: string;
  livro?: string;
  folha?: string;
  dataLavratura?: string;
  infoData?: string;
  cnpjCartorio?: string;
  cartorio?: string;
  tipoCartorio?: string;
  alienantes?: Parte[];
  adquirentes?: Parte[];
}

const DeclaracaoCardComponent: React.FC<{ declaracao: DeclaracaoProps; index: number }> = ({ declaracao, index }) => {
  return (
    <div className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-6 shadow-xs transition-all">
      {/* Topo do Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm font-mono">
            #{index + 1}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-slate-900">
                {declaracao.numDeclaracao ? `Declaração DOI Nº ${declaracao.numDeclaracao}` : 'Operação Imobiliária Registrada'}
              </span>
              {declaracao.tipoDeclaracao && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  {declaracao.tipoDeclaracao}
                </span>
              )}
            </div>
            {declaracao.infoData && (
              <p className="text-xs text-slate-500 mt-0.5">{declaracao.infoData}</p>
            )}
          </div>
        </div>

        {declaracao.dataLavratura && (
          <div className="flex items-center text-xs font-semibold bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            Data do Registro: <span className="ml-1 font-mono">{declaracao.dataLavratura}</span>
          </div>
        )}
      </div>

      {/* Dados do Imóvel & Cartório */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 py-4 my-1">
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 min-w-0 lg:col-span-3 flex flex-col justify-center">
          <span className="text-[11px] font-medium text-slate-500 flex items-center mb-1">
            <FileText className="w-3.5 h-3.5 mr-1.5 text-blue-600 shrink-0" />
            <span className="truncate">Matrícula</span>
          </span>
          <p className="text-sm font-bold text-slate-900 font-mono break-all leading-snug">
            {declaracao.matricula || 'Não informada'}
          </p>
        </div>

        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 min-w-0 lg:col-span-4 flex flex-col justify-center">
          <span className="text-[11px] font-medium text-slate-500 flex items-center mb-1">
            <Building className="w-3.5 h-3.5 mr-1.5 text-blue-600 shrink-0" />
            <span className="truncate">Registro / Livro / Folha</span>
          </span>
          <p className="text-xs sm:text-sm font-bold text-slate-900 font-mono break-words leading-snug">
            {declaracao.registro ? `Reg: ${declaracao.registro}` : ''} 
            {declaracao.livro ? ` • Livro: ${declaracao.livro}` : ''}
            {declaracao.folha ? ` • Fl: ${declaracao.folha}` : ''}
            {!declaracao.registro && !declaracao.livro && !declaracao.folha && 'Geral'}
          </p>
        </div>

        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 min-w-0 sm:col-span-2 lg:col-span-5 flex flex-col justify-center">
          <span className="text-[11px] font-medium text-slate-500 flex items-center mb-1">
            <Landmark className="w-3.5 h-3.5 mr-1.5 text-blue-600 shrink-0" />
            <span className="truncate">Cartório Responsável</span>
          </span>
          <p className="text-sm font-bold text-slate-900 break-words leading-snug">
            {declaracao.cartorio || 'Cartório de Registro de Imóveis'}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500 mt-1">
            {declaracao.tipoCartorio && <span className="break-words">{declaracao.tipoCartorio}</span>}
            {declaracao.cnpjCartorio && (
              <>
                <span>•</span>
                <span className="font-mono break-all">CNPJ: {declaracao.cnpjCartorio}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Partes: Alienantes e Adquirentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
        {/* Alienantes (Quem vendeu) */}
        <div className="space-y-2 min-w-0">
          <div className="flex items-center text-xs font-semibold text-amber-800">
            <Users className="w-3.5 h-3.5 mr-1 text-amber-600 shrink-0" />
            Alienante(s) / Transmitente(s)
          </div>
          {declaracao.alienantes && declaracao.alienantes.length > 0 ? (
            <div className="space-y-1.5">
              {declaracao.alienantes.map((al, idx) => (
                <div key={idx} className="bg-amber-50/40 px-3.5 py-2.5 rounded-xl border border-amber-200/60 text-xs min-w-0">
                  <p className="font-semibold text-slate-900 break-words leading-snug">{al.nome}</p>
                  <p className="text-slate-500 font-mono text-[11px] mt-1 break-all">Doc: {al.cpfCnpj}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Nenhum alienante listado nesta declaração.</p>
          )}
        </div>

        {/* Adquirentes (Quem comprou) */}
        <div className="space-y-2 min-w-0">
          <div className="flex items-center text-xs font-semibold text-emerald-800">
            <UserCheck className="w-3.5 h-3.5 mr-1 text-emerald-600 shrink-0" />
            Adquirente(s) / Comprador(es)
          </div>
          {declaracao.adquirentes && declaracao.adquirentes.length > 0 ? (
            <div className="space-y-1.5">
              {declaracao.adquirentes.map((ad, idx) => (
                <div key={idx} className="bg-emerald-50/40 px-3.5 py-2.5 rounded-xl border border-emerald-200/60 text-xs min-w-0">
                  <p className="font-semibold text-slate-900 break-words leading-snug">{ad.nome}</p>
                  <p className="text-slate-500 font-mono text-[11px] mt-1 break-all">Doc: {ad.cpfCnpj}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Nenhum adquirente listado nesta declaração.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export const DeclaracaoCard = React.memo(DeclaracaoCardComponent);
