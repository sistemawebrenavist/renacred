import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Building, AlertCircle, CheckCircle2, RotateCw, Layers, ShieldCheck, Zap } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { DeclaracaoCard, DeclaracaoProps } from '../../components/imobiliario/DeclaracaoCard';
import { DeclaracaoSkeleton } from '../../components/imobiliario/DeclaracaoSkeleton';
import { ExportPdfButton } from '../../components/imobiliario/ExportPdfButton';
import { ExportExcelButton } from '../../components/imobiliario/ExportExcelButton';

// Cache em memória de sessão para resposta instantânea (0ms)
const sessionQueryCache = new Map<string, {
  periodo?: string;
  total_declaracoes: number;
  declaracoes: DeclaracaoProps[];
}>();

const PROGRESS_STEPS = [
  { label: 'Conectando às bases cartorárias e registros oficiais...', progress: 30 },
  { label: 'Varrendo serventias de registros de imóveis e base DOI...', progress: 65 },
  { label: 'Compilando e validando laudo pericial oficial...', progress: 90 },
];

export default function ConsultarImobiliario() {
  const [searchParams] = useSearchParams();
  const { refreshProfile } = useAuth();

  const [documento, setDocumento] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [fromCache, setFromCache] = useState(false);
  const [result, setResult] = useState<{
    periodo?: string;
    total_declaracoes: number;
    declaracoes: DeclaracaoProps[];
  } | null>(null);

  const stepTimerRef = useRef<any>(null);

  // Se vier parâmetro na URL (?doc=...), busca automaticamente
  useEffect(() => {
    const docParam = searchParams.get('doc');
    if (docParam && docParam !== documento && !loading && !result) {
      setDocumento(docParam);
      handleSearch(docParam);
    }
  }, [searchParams]);

  // Ciclo das micro-etapas de progresso durante o loading
  useEffect(() => {
    if (loading) {
      setCurrentStepIndex(0);
      stepTimerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => (prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev));
      }, 350);
    } else {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    }
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, [loading]);

  const handleSearch = async (docToSearch?: string) => {
    const target = (docToSearch || documento).trim();
    if (!target) {
      toast.error('Informe um CPF ou CNPJ válido.');
      return;
    }

    const cleanDoc = target.replace(/\D/g, '');

    // 1. Verificação no Cache de Sessão do Navegador (0ms)
    if (sessionQueryCache.has(cleanDoc)) {
      const cached = sessionQueryCache.get(cleanDoc)!;
      setResult(cached);
      setFromCache(true);
      toast.success(`Laudo carregado instantaneamente! ${cached.total_declaracoes} declarações localizadas.`, {
        icon: <Zap className="w-4 h-4 text-amber-500" />,
      });
      return;
    }

    setFromCache(false);
    setLoading(true);

    try {
      const response = await api.post('/api/imobiliario/consultar', { documento: target });
      if (response.data?.success) {
        const data = response.data.data;
        // Salva no cache da sessão
        sessionQueryCache.set(cleanDoc, data);
        setResult(data);
        toast.success(`Consulta concluída! ${data.total_declaracoes} declarações encontradas.`);
        // Atualiza saldo no cabeçalho
        refreshProfile();
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Erro ao realizar consulta.';
      toast.error(msg);
      if (error.response?.status === 402) {
        toast.error('Saldo insuficiente. Realize uma recarga na aba Minha Assinatura.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Bloco de Busca */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
              PRODUTO E1
            </span>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Fontes Oficiais Cartorárias & DOI</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <Building className="w-6 h-6 mr-2.5 text-blue-600" />
            E1 - Busca de Imóvel por Documento
          </h2>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
            Pesquisa nacional de histórico de transações, titularidade imobiliária (DOI) e registros cartorários vinculados a um CPF ou CNPJ.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="mt-6 flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                className="w-full bg-white border border-slate-300 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 transition font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-8 py-3.5 rounded-2xl text-sm flex items-center justify-center transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                  Consultando...
                </>
              ) : (
                'Consultar'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Estado de Carregamento com Skeleton Loaders e Barra de Progresso */}
      {loading ? (
        <div key="state-loading" className="space-y-6">
          {/* Card de Progresso em Etapas */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <RotateCw className="w-4 h-4 animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {PROGRESS_STEPS[currentStepIndex].label}
                  </p>
                  <p className="text-xs text-slate-400">
                    Etapa {currentStepIndex + 1} de {PROGRESS_STEPS.length} • Processamento em tempo real
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                {PROGRESS_STEPS[currentStepIndex].progress}%
              </span>
            </div>

            {/* Barra de Progresso Animada */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-linear-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${PROGRESS_STEPS[currentStepIndex].progress}%` }}
              />
            </div>
          </div>

          {/* Skeletons dos Laudos Imobiliários */}
          <div className="space-y-4">
            <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              <Layers className="w-4 h-4 mr-1.5 text-slate-400 animate-pulse" />
              Sincronizando registros imobiliários...
            </div>
            <DeclaracaoSkeleton />
            <DeclaracaoSkeleton />
            <DeclaracaoSkeleton />
          </div>
        </div>
      ) : result ? (
        <div key="state-result" className="space-y-6">
          {/* Barra de Ações & Resumo */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Resultado da Pesquisa</span>
                {fromCache && (
                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <Zap className="w-3 h-3 mr-1 text-amber-500" />
                    Instantâneo (0ms)
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                <span className="text-xl font-bold text-slate-900 font-mono">{documento}</span>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  {result.total_declaracoes} declarações encontradas
                </span>
                {result.periodo && (
                  <span className="text-xs text-slate-500 font-medium">
                    Período: {result.periodo}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <ExportExcelButton documento={documento} declaracoes={result.declaracoes} />
              <ExportPdfButton
                documento={documento}
                totalDeclaracoes={result.total_declaracoes}
                periodo={result.periodo}
                declaracoes={result.declaracoes}
              />
            </div>
          </div>

          {/* Lista de Declarações */}
          {result.declaracoes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-xs">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-900">Nenhum registro de imóvel localizado</p>
              <p className="text-xs text-slate-500 mt-1">
                Não foram identificadas transações imobiliárias ativas ou históricas (DOI) para o documento informado.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                <Layers className="w-4 h-4 mr-1.5 text-blue-600" />
                Histórico de Operações e Matrículas Cartorárias ({result.declaracoes.length})
              </div>
              {result.declaracoes.map((dec, idx) => (
                <DeclaracaoCard key={idx} declaracao={dec} index={idx} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
