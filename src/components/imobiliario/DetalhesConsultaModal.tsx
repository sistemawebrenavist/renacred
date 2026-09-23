import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Building, 
  Car,
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  FileSpreadsheet, 
  FileDown, 
  ShieldCheck,
  User,
  MapPin,
  Clock
} from 'lucide-react';
import api from '../../services/api';
import { DeclaracaoCard } from './DeclaracaoCard';
import { ExportPdfButton } from './ExportPdfButton';
import { ExportExcelButton } from './ExportExcelButton';
import { ExportPdfVeicularButton } from '../veicular/ExportPdfVeicularButton';
import { ExportExcelVeicularButton } from '../veicular/ExportExcelVeicularButton';
import { ProprietarioTimelineCard } from '../veicular/ProprietarioTimelineCard';

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

  const resultData = queryData?.resultData || {};

  // Detecção Inteligente de Produto (E1 - Imobiliário vs E2 - Proprietários Veiculares)
  const isVeicular = Boolean(
    queryData?.requestData?.product === 'E2' ||
    resultData?.placa ||
    (Array.isArray(resultData?.historico) && resultData?.historico.length > 0)
  );

  // E1 Data
  const declaracoes = resultData?.declaracoes || [];
  const totalDeclaracoes = queryData?.totalDeclaracoes || declaracoes.length;
  const periodo = resultData?.periodo || '';

  // E2 Data & Ordenação Cronológica Ascendente (Começa pela data mais antiga!)
  const parseDataHora = (dataStr?: string, horaStr?: string): number => {
    if (!dataStr) return 0;
    try {
      const parts = dataStr.trim().split('/');
      if (parts.length !== 3) return 0;
      const dia = parseInt(parts[0], 10);
      const mes = parseInt(parts[1], 10) - 1;
      const ano = parseInt(parts[2], 10);

      let horas = 0;
      let minutos = 0;
      let segundos = 0;

      if (horaStr) {
        const timeParts = horaStr.trim().split(':');
        horas = parseInt(timeParts[0], 10) || 0;
        minutos = parseInt(timeParts[1], 10) || 0;
        segundos = parseInt(timeParts[2], 10) || 0;
      }

      return new Date(ano, mes, dia, horas, minutos, segundos).getTime();
    } catch {
      return 0;
    }
  };

  const historicoOrdenado = useMemo(() => {
    if (!Array.isArray(resultData?.historico)) return [];
    const list = [...resultData.historico];
    list.sort((a, b) => {
      const timeA = parseDataHora(a.data, a.hora);
      const timeB = parseDataHora(b.data, b.hora);
      return timeA - timeB; // Ascendente: da mais antiga para a mais recente!
    });
    return list;
  }, [resultData?.historico]);

  const totalProprietarios = resultData?.total !== undefined ? resultData.total : historicoOrdenado.length;
  const proprietarioAtual = resultData?.proprietario_atual || historicoOrdenado.find((h: any) => h.atual);

  const formatDoc = (val: string) => {
    if (!val) return '-';
    const c = val.replace(/\D/g, '');
    if (c.length === 11) {
      return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (c.length === 14) {
      return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return val;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 z-10 max-h-[92vh] flex flex-col">
        {/* Header Polimórfico (E1 vs E2) */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center space-x-3.5">
            <div 
              className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs ${
                isVeicular
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-blue-50 border-blue-200 text-blue-600'
              }`}
            >
              {isVeicular ? (
                <Car className="w-5 h-5" />
              ) : (
                <Building className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span 
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ${
                    isVeicular
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  {isVeicular ? 'PRODUTO E2' : 'PRODUTO E1'}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-600">
                  {isVeicular ? 'Laudo Oficial de Proprietários Veiculares' : 'Laudo Oficial de Certidão Imobiliária'}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900">
                {isVeicular
                  ? 'E2 - Histórico de Proprietários por Placa'
                  : 'E1 - Busca de Imóvel por Documento'}
              </h3>

              <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mt-0.5">
                {isVeicular ? (
                  <>
                    <span>Placa: <strong className="text-slate-900 font-bold">{resultData?.placa || queryData?.identifier}</strong></span>
                    {resultData?.renavam && (
                      <span>Renavam: <strong className="text-slate-900 font-bold">{resultData.renavam}</strong></span>
                    )}
                  </>
                ) : (
                  <span>Documento: <strong className="text-slate-900 font-bold">{formatDoc(queryData?.identifier || '')}</strong></span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
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
              {/* RENDERIZAÇÃO PARA PRODUTO E2 (VEICULAR) */}
              {isVeicular ? (
                <>
                  {/* Resumo da Consulta E2 */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-100 text-emerald-900 border border-emerald-300">
                          PRODUTO E2
                        </span>
                        <span className="text-xs text-slate-500 font-medium">Placa:</span>
                        <span className="text-sm font-bold font-mono text-slate-900">
                          {resultData?.placa || queryData.identifier}
                        </span>
                        {resultData?.renavam && (
                          <span className="text-xs text-slate-500 font-mono">
                            • Renavam: <strong className="text-slate-800">{resultData.renavam}</strong>
                          </span>
                        )}
                        {queryData.status === 'ERROR' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Falha no processamento
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {totalProprietarios} proprietários
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-slate-500">
                        <span>Data da Pesquisa: {new Date(queryData.createdAt).toLocaleString('pt-BR')}</span>
                        {queryData.cost > 0 && <span>Tarifa: R$ {Number(queryData.cost).toFixed(2)}</span>}
                      </div>
                    </div>

                    {queryData.status !== 'ERROR' && historicoOrdenado.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <ExportExcelVeicularButton
                          placa={resultData?.placa || queryData.identifier}
                          renavam={resultData?.renavam}
                          historico={historicoOrdenado}
                        />
                        <ExportPdfVeicularButton
                          placa={resultData?.placa || queryData.identifier}
                          renavam={resultData?.renavam}
                          total={totalProprietarios}
                          proprietarioAtual={proprietarioAtual}
                          historico={historicoOrdenado}
                        />
                      </div>
                    )}
                  </div>

                  {/* Card de Destaque: Proprietário Atual Vigente */}
                  {proprietarioAtual && (
                    <div className="bg-gradient-to-br from-blue-50/60 via-white to-white border border-blue-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-blue-100">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1D4ED8] text-white">
                            PROPRIETÁRIO ATUAL VIGENTE
                          </span>
                          <span className="text-xs text-blue-900/70 font-medium">Titular Atual Registrado</span>
                        </div>
                        <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                          Situação Regular
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[11px] text-slate-500 font-medium block">Nome Completo do Titular:</span>
                          <div className="flex items-center mt-1">
                            <User className="w-4 h-4 mr-2 text-blue-600 shrink-0" />
                            <span className="font-bold text-slate-900 text-sm">
                              {proprietarioAtual.nome || 'NÃO INFORMADO'}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[11px] text-slate-500 font-medium block">Documento:</span>
                          <div className="flex items-center gap-2 mt-1 font-mono">
                            <span className="font-bold text-slate-800 text-sm">
                              {formatDoc(proprietarioAtual.documento)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-slate-100 text-slate-600">
                              {proprietarioAtual.tipo || 'Pessoa'}
                            </span>
                          </div>
                        </div>

                        <div className="sm:col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center text-slate-700">
                            <MapPin className="w-4 h-4 mr-1.5 text-slate-400" />
                            <span className="font-semibold">{proprietarioAtual.municipio || 'MUNICÍPIO NÃO INFORMADO'}</span>
                            {proprietarioAtual.uf && <span className="ml-1 font-bold text-slate-500">/ {proprietarioAtual.uf}</span>}
                          </div>
                          {proprietarioAtual.evento && (
                            <span className="text-xs text-slate-500 font-mono">
                              Evento: {proprietarioAtual.evento}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Linha do Tempo / Timeline Ordenada (Da mais antiga para a mais recente) */}
                  {queryData.status === 'ERROR' ? (
                    <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-8 text-center text-slate-700 shadow-xs">
                      <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-900">Falha no Processamento desta Consulta</p>
                      <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto">
                        {queryData.errorData?.message || 'Ocorreu uma instabilidade momentânea na comunicação com a base de dados veicular.'}
                      </p>
                    </div>
                  ) : historicoOrdenado.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 shadow-xs">
                      <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-800">Nenhum histórico de proprietários localizado</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Não constam registros de transferências para esta placa no registro veicular.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                          Cadeia Dominial Cronológica ({historicoOrdenado.length} registros)
                        </h4>
                        <span className="text-[11px] font-medium text-slate-500">
                          Exibindo do registro mais antigo ao vigente
                        </span>
                      </div>

                      <div className="pt-2">
                        {historicoOrdenado.map((item: any, idx: number) => (
                          <ProprietarioTimelineCard
                            key={idx}
                            item={{
                              ...item,
                              ordem: idx + 1,
                              total: historicoOrdenado.length,
                              isFirst: idx === 0,
                              isLast: idx === historicoOrdenado.length - 1,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* RENDERIZAÇÃO ORIGINAL PARA PRODUTO E1 (IMOBILIÁRIO) */
                <>
                  {/* Resumo da Consulta */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-100 text-blue-800 border border-blue-200">
                          PRODUTO E1
                        </span>
                        <span className="text-xs text-slate-500 font-medium">Documento:</span>
                        <span className="text-sm font-bold font-mono text-slate-900">{formatDoc(queryData.identifier)}</span>
                        {queryData.status === 'ERROR' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Falha no processamento
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {totalDeclaracoes} declarações
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-slate-500">
                        {periodo && <span>Período: {periodo}</span>}
                        <span>Data: {new Date(queryData.createdAt).toLocaleString('pt-BR')}</span>
                        {queryData.cost > 0 && <span>Tarifa: R$ {Number(queryData.cost).toFixed(2)}</span>}
                      </div>
                    </div>

                    {queryData.status !== 'ERROR' && declaracoes.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <ExportExcelButton documento={formatDoc(queryData.identifier)} declaracoes={declaracoes} />
                        <ExportPdfButton
                          documento={formatDoc(queryData.identifier)}
                          totalDeclaracoes={totalDeclaracoes}
                          periodo={periodo}
                          declaracoes={declaracoes}
                        />
                      </div>
                    )}
                  </div>

                  {/* Lista de Declarações */}
                  {queryData.status === 'ERROR' ? (
                    <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-8 text-center text-slate-700 shadow-xs">
                      <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-900">Falha no Processamento desta Consulta</p>
                      <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto">
                        {queryData.errorData?.message || 'Ocorreu uma instabilidade ou timeout na comunicação com a base cartorária no momento desta pesquisa.'}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        Nenhum valor foi debitado do seu saldo. Você pode fechar este laudo e realizar uma nova pesquisa.
                      </p>
                    </div>
                  ) : declaracoes.length === 0 ? (
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
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
