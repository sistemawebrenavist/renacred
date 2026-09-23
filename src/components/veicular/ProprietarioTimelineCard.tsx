import React from 'react';
import { Calendar, Clock, MapPin, User, Building, CheckCircle2, Shield, ArrowRight } from 'lucide-react';

export interface ProprietarioTimelineProps {
  ordem: number;
  documento: string;
  tipo: string;
  nome: string;
  data: string;
  hora: string;
  uf: string;
  municipio: string;
  evento: string | null;
  atual: boolean;
  total: number;
  isFirst: boolean;
  isLast: boolean;
}

export const ProprietarioTimelineCard: React.FC<{ item: ProprietarioTimelineProps }> = ({ item }) => {
  const formatDocumento = (doc: string) => {
    if (!doc) return '-';
    const clean = doc.replace(/\D/g, '');
    if (clean.length === 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (clean.length === 14) {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
  };

  const isPessoaFisica = (item.tipo || '').toLowerCase().includes('fisica');

  return (
    <div className="relative pl-8 pb-6 last:pb-2 group">
      {/* Linha vertical conectando os nós da timeline */}
      {!item.isLast && (
        <div className="absolute left-[15px] top-6 bottom-0 w-0.5 bg-slate-200 group-hover:bg-blue-300 transition-colors" />
      )}

      {/* Marcador do nó na linha do tempo */}
      <div 
        className={`absolute left-0 top-1.5 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold font-mono transition-transform group-hover:scale-105 ${
          item.atual
            ? 'bg-emerald-600 border-emerald-200 text-white shadow-sm ring-4 ring-emerald-50'
            : item.isFirst
              ? 'bg-blue-600 border-blue-200 text-white shadow-xs'
              : 'bg-white border-slate-300 text-slate-700 shadow-xs'
        }`}
      >
        {item.atual ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <span>{item.ordem}</span>
        )}
      </div>

      {/* Card de Conteúdo do Registro */}
      <div 
        className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-xs ${
          item.atual
            ? 'bg-gradient-to-br from-emerald-50/40 via-white to-white border-emerald-200 ring-1 ring-emerald-500/20'
            : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-sm'
        }`}
      >
        {/* Cabeçalho do Card */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span 
              className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider border ${
                item.atual
                  ? 'bg-emerald-100/80 text-emerald-800 border-emerald-300'
                  : item.isFirst
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {item.atual
                ? 'Registro Vigente (Proprietário Atual)'
                : item.isFirst
                  ? '1º Registro Histórico Localizado'
                  : `${item.ordem}º Registro Histórico`}
            </span>

            {item.evento && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                {item.evento}
              </span>
            )}
          </div>

          {/* Data e Hora */}
          <div className="flex items-center space-x-3 text-xs text-slate-500 font-mono">
            <div className="flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
              <span>{item.data || '-'}</span>
            </div>
            {item.hora && (
              <div className="flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                <span>{item.hora}</span>
              </div>
            )}
          </div>
        </div>

        {/* Detalhes do Titular */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Nome do Titular:</span>
            <div className="flex items-center mt-0.5">
              {isPessoaFisica ? (
                <User className="w-3.5 h-3.5 mr-1.5 text-blue-600 shrink-0" />
              ) : (
                <Building className="w-3.5 h-3.5 mr-1.5 text-amber-600 shrink-0" />
              )}
              <span className="font-bold text-slate-900 text-sm truncate">
                {item.nome || 'NÃO INFORMADO'}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Documento Identificador:</span>
            <div className="flex items-center gap-2 mt-0.5 font-mono">
              <span className="font-bold text-slate-800">
                {formatDocumento(item.documento)}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-sans font-medium bg-slate-100 text-slate-600">
                {item.tipo || (isPessoaFisica ? 'PF' : 'PJ')}
              </span>
            </div>
          </div>

          <div className="sm:col-span-2 pt-2 border-t border-slate-100/80 flex items-center justify-between text-slate-600">
            <div className="flex items-center">
              <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              <span className="font-semibold text-slate-800">
                {item.municipio || 'MUNICÍPIO NÃO INFORMADO'}
              </span>
              {item.uf && (
                <span className="ml-1 text-slate-500 font-bold">/ {item.uf}</span>
              )}
            </div>

            {item.atual && (
              <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                Titularidade Ativa
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
