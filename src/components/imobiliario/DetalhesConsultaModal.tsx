import React, { useState, useEffect } from 'react';
import { X, Building, Calendar, CheckCircle2, AlertCircle, RotateCw, FileSpreadsheet, FileDown } from 'lucide-react';
import api from '../../services/api';
import { DeclaracaoCard } from './DeclaracaoCard';
import { ExportPdfButton } from './ExportPdfButton';
import { ExportExcelButton } from './ExportExcelButton';

interface DetalhesConsultaModalProps {
  isOpen: boolean;
  queryId: string | null;
  onClose: () => void;
}

export default function DetalhesConsultaModal({ isOpen, queryId, onClose }: DetalhesConsultaModalProps) {
  const [loading, setLoading] = useState(false);
  const [queryData, setQueryData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !queryId) {
      setQueryData(null);
      setError(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/api/imobiliario/historico/${queryId}`);
        if (response.data?.success) {
          setQueryData(response.data.data);
        } else {
          setError('Não foi possível carregar os detalhes da consulta.');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Erro ao carregar detalhes da consulta.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, queryId]);

  if (!isOpen) return null;

  const resultData = queryData?.resultData || {};
  const declaracoes = resultData?.declaracoes || [];
  const totalDeclaracoes = queryData?.totalDeclaracoes || declaracoes.length;
  const periodo = resultData?.periodo || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 z-10 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Resultado da Consulta
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {queryData?.identifier || 'Carregando...'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto py-5 space-y-6 flex-1 pr-1">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RotateCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Carregando dados da consulta...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center space-y-2">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-900">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition"
              >
                Fechar
              </button>
            </div>
          ) : queryData ? (
            <>
              {/* Resumo da Consulta */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500 font-medium">Documento:</span>
                    <span className="text-sm font-bold font-mono text-slate-900">{queryData.identifier}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {totalDeclaracoes} declarações
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-slate-500">
                    {periodo && <span>Período: {periodo}</span>}
                    <span>Data: {new Date(queryData.createdAt).toLocaleString('pt-BR')}</span>
                    {queryData.cost > 0 && <span>Tarifa: R$ {Number(queryData.cost).toFixed(2)}</span>}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <ExportExcelButton documento={queryData.identifier} declaracoes={declaracoes} />
                  <ExportPdfButton
                    documento={queryData.identifier}
                    totalDeclaracoes={totalDeclaracoes}
                    periodo={periodo}
                    declaracoes={declaracoes}
                  />
                </div>
              </div>

              {/* Lista de Declarações */}
              {declaracoes.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 shadow-xs">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-800">Nenhum registro de imóvel localizado</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Não constam declarações de operações imobiliárias registradas para este documento no período consultado.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Declarações Registradas ({declaracoes.length})
                  </h4>
                  {declaracoes.map((item: any, idx: number) => (
                    <DeclaracaoCard key={idx} declaracao={item} index={idx} />
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
