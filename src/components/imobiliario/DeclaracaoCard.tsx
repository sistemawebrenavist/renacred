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

export const DeclaracaoCard: React.FC<{ declaracao: DeclaracaoProps; index: number }> = ({ declaracao, index }) => {
  return (
    <div className="bg-[#0f172a]/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 shadow-xl transition-all">
      {/* Topo do Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm font-mono">
            #{index + 1}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-white">
                {declaracao.numDeclaracao ? `Declaração DOI Nº ${declaracao.numDeclaracao}` : 'Operação Imobiliária Registrada'}
              </span>
              {declaracao.tipoDeclaracao && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {declaracao.tipoDeclaracao}
                </span>
              )}
            </div>
            {declaracao.infoData && (
              <p className="text-xs text-slate-400 mt-0.5">{declaracao.infoData}</p>
            )}
          </div>
        </div>

        {declaracao.dataLavratura && (
          <div className="flex items-center text-xs font-semibold bg-slate-800 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
            Data do Registro: {declaracao.dataLavratura}
          </div>
        )}
      </div>

      {/* Dados do Imóvel & Cartório */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-4 my-2">
        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/60">
          <span className="text-[11px] font-medium text-slate-400 flex items-center mb-1">
            <FileText className="w-3 h-3 mr-1 text-blue-400" />
            Matrícula
          </span>
          <p className="text-sm font-bold text-white font-mono">{declaracao.matricula || 'Não informada'}</p>
        </div>

        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/60">
          <span className="text-[11px] font-medium text-slate-400 flex items-center mb-1">
            <Building className="w-3 h-3 mr-1 text-blue-400" />
            Registro / Livro / Folha
          </span>
          <p className="text-sm font-bold text-white font-mono">
            {declaracao.registro ? `Reg: ${declaracao.registro}` : ''} 
            {declaracao.livro ? ` • Livro: ${declaracao.livro}` : ''}
            {declaracao.folha ? ` • Fl: ${declaracao.folha}` : ''}
            {!declaracao.registro && !declaracao.livro && !declaracao.folha && 'Geral'}
          </p>
        </div>

        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/60 md:col-span-2">
          <span className="text-[11px] font-medium text-slate-400 flex items-center mb-1">
            <Landmark className="w-3 h-3 mr-1 text-blue-400" />
            Cartório Responsável
          </span>
          <p className="text-sm font-bold text-white truncate">
            {declaracao.cartorio || 'Cartório de Registro de Imóveis'}
          </p>
          <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
            {declaracao.tipoCartorio && <span>{declaracao.tipoCartorio}</span>}
            {declaracao.cnpjCartorio && (
              <>
                <span>•</span>
                <span>CNPJ: {declaracao.cnpjCartorio}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Partes: Alienantes e Adquirentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
        {/* Alienantes (Quem vendeu) */}
        <div className="space-y-2">
          <div className="flex items-center text-xs font-semibold text-amber-400">
            <Users className="w-3.5 h-3.5 mr-1" />
            Alienante(s) / Transmitente(s)
          </div>
          {declaracao.alienantes && declaracao.alienantes.length > 0 ? (
            <div className="space-y-1.5">
              {declaracao.alienantes.map((al, idx) => (
                <div key={idx} className="bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-800 text-xs">
                  <p className="font-semibold text-slate-200">{al.nome}</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">Doc: {al.cpfCnpj}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Nenhum alienante listado nesta declaração.</p>
          )}
        </div>

        {/* Adquirentes (Quem comprou) */}
        <div className="space-y-2">
          <div className="flex items-center text-xs font-semibold text-emerald-400">
            <UserCheck className="w-3.5 h-3.5 mr-1" />
            Adquirente(s) / Comprador(es)
          </div>
          {declaracao.adquirentes && declaracao.adquirentes.length > 0 ? (
            <div className="space-y-1.5">
              {declaracao.adquirentes.map((ad, idx) => (
                <div key={idx} className="bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-800 text-xs">
                  <p className="font-semibold text-slate-200">{ad.nome}</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">Doc: {ad.cpfCnpj}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Nenhum adquirente listado nesta declaração.</p>
          )}
        </div>
      </div>
    </div>
  );
};
