import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  AlertCircle, 
  RotateCw, 
  Car, 
  Building, 
  User, 
  Scale, 
  ShieldCheck 
} from 'lucide-react';
import api from '../../services/api';
import { PRODUCTS_CATALOG, ProductDefinition } from '../../config/productsCatalog';
import { LaudoPericialUniversal } from '../consultas/LaudoPericialUniversal';

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
  const reqData = queryData?.requestData || {};

  // Detecção Inteligente e Universal do Código do Produto (E1 a E16)
  const detectedProductCode = useMemo(() => {
    if (reqData.product) return reqData.product;
    if (resultData.placa || (Array.isArray(resultData.historico) && resultData.historico.length > 0)) {
      return 'E2';
    }
    if (Array.isArray(resultData.multas) || resultData.total_multas !== undefined) {
      return 'E8';
    }
    if (resultData.score !== undefined || resultData.mosaic !== undefined) {
      return 'E13';
    }
    if (Array.isArray(resultData.pendencias_financeiras) || Array.isArray(resultData.protestos)) {
      return 'E12';
    }
    if (Array.isArray(resultData.socios) || Array.isArray(resultData.participacoes)) {
      return 'E5';
    }
    if (queryData?.identifier) {
      const clean = queryData.identifier.replace(/[^a-zA-Z0-9]/g, '');
      if (clean.length === 7 || clean.length === 8) {
        return 'E8';
      }
    }
    return 'E1';
  }, [reqData.product, resultData, queryData?.identifier]);

  // Definição Completa do Produto a partir do Catálogo Oficial
  const productDef: ProductDefinition = useMemo(() => {
    const found = PRODUCTS_CATALOG.find((p) => p.code === detectedProductCode);
    if (found) return found;

    const isVeic = ['E2', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11'].includes(detectedProductCode);
    return {
      code: detectedProductCode,
      slug: detectedProductCode.toLowerCase(),
      name: reqData.productName || 'Consulta Oficial Renacred',
      shortName: reqData.productName || detectedProductCode,
      category: isVeic ? 'veicular' : 'cadastral',
      categoryLabel: isVeic ? 'Veicular' : 'Cadastral',
      inputType: isVeic ? 'placa' : 'cpf_cnpj',
      inputLabel: isVeic ? 'Placa' : 'Documento',
      placeholder: '',
      description: '',
      highlights: [],
      defaultCost: 0,
      defaultPrice: Number(queryData?.cost || 0),
      hasContingency: false,
      badgeColor: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200'
      }
    };
  }, [detectedProductCode, reqData.productName, queryData?.cost]);

  const formatIdentifier = (val: string) => {
    if (!val) return '-';
    const clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (clean.length === 7) {
      return `${clean.substring(0, 3)}-${clean.substring(3)}`;
    }
    if (clean.length === 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (clean.length === 14) {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return val;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:static print:inset-auto print:overflow-visible">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity print:hidden" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-5xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 z-10 max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:p-0 print:w-full">
        {/* Header Superior do Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0 print:hidden">
          {loading ? (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                <RotateCw className="w-5 h-5 animate-spin text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Carregando Consulta...</h3>
                <p className="text-xs text-slate-400">Buscando laudo pericial oficial</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Consulta Indisponível</h3>
                <p className="text-xs text-slate-400">Não foi possível carregar os dados desta pesquisa</p>
              </div>
            </div>
          ) : queryData ? (
            <div className="flex items-center space-x-3.5">
              <div 
                className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs ${
                  productDef.category === 'veicular'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : productDef.category === 'imobiliario'
                    ? 'bg-blue-50 border-blue-200 text-blue-600'
                    : productDef.category === 'juridico'
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                }`}
              >
                {productDef.category === 'veicular' ? (
                  <Car className="w-5 h-5" />
                ) : productDef.category === 'imobiliario' ? (
                  <Building className="w-5 h-5" />
                ) : productDef.category === 'juridico' ? (
                  <Scale className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span 
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ${productDef.badgeColor.bg} ${productDef.badgeColor.text} ${productDef.badgeColor.border}`}
                  >
                    PRODUTO {productDef.code}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-semibold text-slate-600">
                    {productDef.categoryLabel} • {productDef.name}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900">
                  {productDef.code} - {productDef.shortName}
                </h3>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 font-mono mt-0.5">
                  <span>
                    {productDef.inputType === 'placa' || resultData?.placa ? 'Placa' : 'Documento'}:{' '}
                    <strong className="text-slate-900 font-bold">
                      {formatIdentifier(resultData?.placa || queryData.identifier)}
                    </strong>
                  </span>
                  {resultData?.renavam && (
                    <span>
                      • Renavam: <strong className="text-slate-800">{resultData.renavam}</strong>
                    </span>
                  )}
                  {queryData.company?.razaoSocial && (
                    <span className="font-sans text-slate-500">
                      • Cliente:{' '}
                      <strong className="text-slate-800">{queryData.company.razaoSocial}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body com Laudo Pericial Universal */}
        <div className="overflow-y-auto py-4 space-y-4 flex-1 pr-1 print:overflow-visible print:p-0">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <RotateCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Carregando dados da consulta...</p>
              <p className="text-xs text-slate-400">Descriptografando certidão e montando laudo pericial</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center space-y-2">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="text-base font-bold text-slate-900">{error}</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Verifique se a consulta foi concluída com sucesso ou entre em contato com o suporte da Renacred.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          ) : queryData ? (
            queryData.status === 'ERROR' ? (
              <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-8 text-center text-slate-700 shadow-xs">
                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                <p className="text-base font-bold text-slate-900">Falha no Processamento desta Consulta</p>
                <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto">
                  {queryData.errorData?.message || 'Ocorreu um erro no provedor ou instabilidade momentânea durante a execução desta consulta via API.'}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Nenhum valor foi faturado para esta tentativa com erro.
                </p>
              </div>
            ) : (
              <LaudoPericialUniversal
                produto={productDef}
                identifier={queryData.identifier}
                dados={resultData}
                hash={reqData.hash || queryData.id}
                totalRegistros={queryData.totalDeclaracoes || 0}
                custoDebitado={Number(queryData.cost || 0)}
                consultadoEm={queryData.createdAt}
                tempoRespostaMs={queryData.processingTimeMs || undefined}
              />
            )
          ) : null}
        </div>

        {/* Rodapé do Modal */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-shrink-0 print:hidden">
          <div className="text-[11px] text-slate-400">
            {queryData && (
              <span>
                ID da Consulta: <span className="font-mono text-slate-500">{queryData.id}</span>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
