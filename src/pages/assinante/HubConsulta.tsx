import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Eye } from 'lucide-react';
import {
  PRODUCTS_CATALOG,
  ProductDefinition,
  getProductByCode
} from '../../config/productsCatalog';
import { SeletorProdutoModal } from '../../components/consultas/SeletorProdutoModal';
import { LaudoPericialUniversal } from '../../components/consultas/LaudoPericialUniversal';
import {
  maskPlaca,
  isValidPlaca,
  maskCPF,
  maskDocument,
  maskChassi,
  maskRenavam
} from '../../utils/masks';

// Cache em memória de sessão por documento/placa para resposta imediata (0ms)
const sessionHubCache = new Map<string, any>();

const PROGRESS_STEPS = [
  'Conectando aos órgãos emissores e bases oficiais...',
  'Varrendo bases federais, cartorárias e estaduais...',
  'Compilando laudo pericial oficial e validando integridade...'
];

export default function HubConsulta() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  // 1. Resolução do produto ativo
  const produtoParam = searchParams.get('produto') || searchParams.get('p') || searchParams.get('codigo') || 'e1';
  const currentProduct: ProductDefinition = useMemo(() => {
    return getProductByCode(produtoParam) || PRODUCTS_CATALOG[0];
  }, [produtoParam]);

  // Estados principais
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<{
    queryId?: string;
    identifier: string;
    dados: any;
    hash: string;
    totalRegistros: number;
    custoDebitado: number;
    consultadoEm: string;
    tempoRespostaMs?: number;
  } | null>(null);

  // Histórico recente do produto ativo
  const [recentQueries, setRecentQueries] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const stepTimerRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Formatação de máscaras de entrada (Padrão Oficial InfoSinistros)
  const formatInput = (val: string, type: ProductDefinition['inputType']): string => {
    if (type === 'placa') {
      return maskPlaca(val);
    }
    if (type === 'chassi') {
      return maskChassi(val);
    }
    if (type === 'renavam') {
      return maskRenavam(val);
    }
    if (type === 'cpf') {
      return maskCPF(val);
    }
    if (type === 'cpf_cnpj') {
      return maskDocument(val);
    }
    if (type === 'rg') {
      return val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
    }
    return val;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatInput(e.target.value, currentProduct.inputType);
    setInputValue(formatted);
  };

  // Carregar histórico recente do produto selecionado
  const loadRecentQueries = async (code: string) => {
    setLoadingHistory(true);
    try {
      const response = await api.get(`/api/consultas/historico?produto=${code}&limit=8`);
      if (response.data?.success) {
        setRecentQueries(response.data.queries || []);
      }
    } catch (err) {
      console.error('Erro ao buscar histórico de consultas:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Ao trocar produto ou montar
  useEffect(() => {
    setInputValue('');
    setResult(null);
    loadRecentQueries(currentProduct.code);
    inputRef.current?.focus();
  }, [currentProduct.code]);

  // Se houver parâmetro ?q= ou ?query= ou ?doc= na URL, preenche automaticamente
  useEffect(() => {
    const queryInUrl = searchParams.get('q') || searchParams.get('query') || searchParams.get('doc');
    if (queryInUrl && !result && !loading) {
      const formatted = formatInput(queryInUrl, currentProduct.inputType);
      setInputValue(formatted);
    }
  }, [searchParams, currentProduct.inputType]);

  // Ciclo dos passos de loading
  useEffect(() => {
    if (loading) {
      setStepIndex(0);
      stepTimerRef.current = setInterval(() => {
        setStepIndex((prev) => (prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev));
      }, 500);
    } else {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    }
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, [loading]);

  // Ação de seleção de outro produto via Modal
  const handleSelectProduct = (newProd: ProductDefinition) => {
    setIsSelectorOpen(false);
    setSearchParams({ produto: newProd.code.toLowerCase() });
  };

  // Execução da Consulta
  const handleExecuteSearch = async (overrideValue?: string) => {
    const target = (overrideValue || inputValue).trim();
    if (!target) {
      toast.error(`Informe ${currentProduct.inputLabel.toLowerCase()} para consultar.`);
      return;
    }

    const clean = target.replace(/[^a-zA-Z0-9]/g, '');

    // Validação estrita de placa (Cinza e Mercosul)
    if (currentProduct.inputType === 'placa' && !isValidPlaca(clean)) {
      toast.error('Placa incompleta ou inválida. Digite no formato AAA-0000 ou AAA-0A00.');
      return;
    }

    const cacheKey = `${currentProduct.code}:${clean}`;

    // 1. Resposta instantânea se em cache de sessão
    if (sessionHubCache.has(cacheKey)) {
      const cached = sessionHubCache.get(cacheKey);
      setResult(cached);
      toast.success('Laudo recuperado instantaneamente da sessão.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(`/api/consultas/${currentProduct.code}`, {
        query: clean
      });

      if (response.data?.success) {
        const payload = response.data;
        const resultObject = {
          queryId: payload.queryId,
          identifier: payload.parametro_pesquisado,
          dados: payload.dados,
          hash: payload.hash_autenticacao,
          totalRegistros: payload.total_registros,
          custoDebitado: payload.custo_debitado,
          consultadoEm: payload.consultado_em,
          tempoRespostaMs: payload.tempo_resposta_ms
        };

        sessionHubCache.set(cacheKey, resultObject);
        setResult(resultObject);

        if (payload.total_registros > 0) {
          toast.success(`Consulta realizada com sucesso: ${payload.total_registros} registro(s) localizado(s).`);
        } else {
          toast.info('Nenhum registro localizado nas bases oficiais. Custo debitado: R$ 0,00.');
        }

        refreshProfile();
        loadRecentQueries(currentProduct.code);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Falha ao comunicar com os órgãos emissores.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Visualizar laudo a partir do histórico
  const handleViewHistoricalLaudo = async (item: any) => {
    let resultData = item.resultData;
    let requestData = item.requestData;

    // Se resultData não veio na listagem compacta, busca os detalhes completos da consulta
    if (!resultData) {
      try {
        const res = await api.get(`/api/consultas/detalhes/${item.id}`);
        if (res.data?.success && res.data.query?.resultData) {
          resultData = res.data.query.resultData;
          requestData = res.data.query.requestData || requestData;
        }
      } catch (err) {
        console.error('Erro ao buscar detalhes da consulta:', err);
      }
    }

    if (!resultData) {
      toast.error('Não foi possível carregar os dados deste laudo.');
      return;
    }

    setResult({
      queryId: item.id,
      identifier: item.identifier,
      dados: resultData,
      hash: requestData?.hash || item.hash || item.id,
      totalRegistros: item.totalRegistros ?? item.totalDeclaracoes ?? (resultData ? 1 : 0),
      custoDebitado: Number(item.cost ?? item.custoDebitado ?? 0),
      consultadoEm: item.createdAt,
      tempoRespostaMs: item.processingTimeMs
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reconsultar a partir do histórico
  const handleRequeryHistorical = (item: any) => {
    const formatted = formatInput(item.identifier, currentProduct.inputType);
    setInputValue(formatted);
    setResult(null);
    handleExecuteSearch(formatted);
  };

  // Cálculo de Preço do Produto
  const unitPrice = useMemo(() => {
    if (user?.isSuperAdmin) return 0;
    if (user?.company?.customQueryPrice) return Number(user.company.customQueryPrice);
    return currentProduct.defaultPrice;
  }, [user, currentProduct]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Barra Superior de Identificação do Produto */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start md:items-center space-x-3">
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono border ${currentProduct.badgeColor.bg} ${currentProduct.badgeColor.text} ${currentProduct.badgeColor.border}`}
            >
              {currentProduct.code}
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-slate-900">
                  {currentProduct.name}
                </h1>
                <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {currentProduct.categoryLabel}
                </span>
                {currentProduct.hasContingency && (
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    Contingência Ativa
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentProduct.description}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setIsSelectorOpen(true)}
              className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition"
            >
              Alterar Produto
            </button>
            <button
              onClick={() => navigate('/produtos')}
              className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-lg transition"
            >
              Ver Catálogo Completo
            </button>
          </div>
        </div>
      </div>

      {/* Formulário de Busca */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecuteSearch();
          }}
          className="space-y-4"
        >
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {currentProduct.inputLabel}
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder={currentProduct.placeholder}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 focus:bg-white transition disabled:opacity-60"
                />
                {inputValue && !loading && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputValue('');
                      inputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-700"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="submit"
                disabled={loading || !inputValue.trim()}
                className="w-full md:w-auto px-5 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg transition shadow-xs flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Consultando...</span>
                  </>
                ) : (
                  <span>Executar Consulta</span>
                )}
              </button>

              {result && (
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setInputValue('');
                    inputRef.current?.focus();
                  }}
                  className="px-3.5 py-2.5 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                >
                  Nova Consulta
                </button>
              )}
            </div>
          </div>

          {/* Destaques Técnicos e Regra de Cobrança */}
          <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-slate-700">Garantia Renacred:</span>
              <span className="text-slate-600">Cobrança de R$ 0,00 se nenhum dado for localizado.</span>
              <span>•</span>
              <span className="text-slate-600">Tempo médio de resposta &lt; 2.5s.</span>
            </div>
            <div className="font-mono text-slate-700">
              Valor da consulta:{' '}
              <strong className="text-slate-900">
                {unitPrice === 0 ? 'Isento' : `R$ ${unitPrice.toFixed(2).replace('.', ',')}`}
              </strong>
            </div>
          </div>
        </form>

        {/* Micro-etapas de Progresso em Loading */}
        {loading && (
          <div className="mt-5 pt-4 border-t border-slate-100 animate-in fade-in duration-150">
            <div className="flex items-center space-x-3">
              <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-slate-700">
                {PROGRESS_STEPS[stepIndex]}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Exibição do Laudo Pericial Oficial */}
      {result && (
        <div className="animate-in fade-in duration-200">
          <LaudoPericialUniversal
            produto={currentProduct}
            identifier={result.identifier}
            dados={result.dados}
            hash={result.hash}
            totalRegistros={result.totalRegistros}
            custoDebitado={result.custoDebitado}
            consultadoEm={result.consultadoEm}
            tempoRespostaMs={result.tempoRespostaMs}
          />
        </div>
      )}

      {/* Histórico Recente do Produto Ativo */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Consultas Recentes — {currentProduct.code} ({currentProduct.shortName})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Últimas requisições realizadas por sua organização para este serviço
            </p>
          </div>
          <button
            onClick={() => loadRecentQueries(currentProduct.code)}
            disabled={loadingHistory}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200/80 transition"
          >
            {loadingHistory ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        {recentQueries.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Nenhuma consulta registrada para {currentProduct.code} recentemente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-2">Identificador</th>
                  <th className="pb-2">Data e Hora</th>
                  <th className="pb-2 text-right">Registros</th>
                  <th className="pb-2 text-right">Custo</th>
                  <th className="pb-2 text-right">Tempo</th>
                  <th className="pb-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {recentQueries.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 font-bold text-slate-800">
                      {q.identifier}
                    </td>
                    <td className="py-2.5 text-slate-500 font-sans">
                      {new Date(q.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2.5 text-right font-sans">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                          (q.totalRegistros ?? q.totalDeclaracoes ?? 0) > 0
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {q.totalRegistros ?? q.totalDeclaracoes ?? 0}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-slate-700 font-mono">
                      R$ {Number(q.cost || 0).toFixed(2).replace('.', ',')}
                      {Number(q.cost || 0) === 0 && (
                        <span className="text-[10px] text-slate-400 block font-sans">Isento</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-slate-400 font-sans text-[11px]">
                      {q.processingTimeMs ? `${q.processingTimeMs}ms` : '-'}
                    </td>
                    <td className="py-2.5 text-right font-sans space-x-2">
                      <button
                        onClick={() => handleViewHistoricalLaudo(q)}
                        className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                        title="Visualizar laudo completo desta consulta"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Visualizar
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => handleRequeryHistorical(q)}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
                      >
                        Reconsultar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Seleção de Produto */}
      <SeletorProdutoModal
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onSelect={handleSelectProduct}
        currentCode={currentProduct.code}
      />
    </div>
  );
}
