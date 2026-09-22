import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Building,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  Layers,
  Zap,
  Clock,
  Eye,
  FileText,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { DeclaracaoCard, DeclaracaoProps } from '../../components/imobiliario/DeclaracaoCard';
import { DeclaracaoSkeleton } from '../../components/imobiliario/DeclaracaoSkeleton';
import { ExportPdfButton } from '../../components/imobiliario/ExportPdfButton';
import { ExportExcelButton } from '../../components/imobiliario/ExportExcelButton';
import DetalhesConsultaModal from '../../components/imobiliario/DetalhesConsultaModal';
import ConfirmModal from '../../components/ui/ConfirmModal';

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

  // Histórico de Últimas Consultas Realizadas
  const [recentQueries, setRecentQueries] = useState<any[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);

  // Modais de Exclusão Irreversível
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [queryToDelete, setQueryToDelete] = useState<{ id: string; identifier: string } | null>(null);
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const stepTimerRef = useRef<any>(null);

  // Carregar histórico de últimas consultas do assinante
  const fetchRecentQueries = async () => {
    setLoadingQueries(true);
    try {
      const response = await api.get('/api/imobiliario/historico?page=1&limit=10');
      if (response.data?.success) {
        setRecentQueries(response.data.data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar últimas consultas:', err);
    } finally {
      setLoadingQueries(false);
    }
  };

  useEffect(() => {
    fetchRecentQueries();
  }, []);

  const handleConfirmDelete = async () => {
    if (!queryToDelete) return;
    setDeleting(true);
    try {
      const response = await api.delete(`/api/imobiliario/historico/${queryToDelete.id}`);
      if (response.data?.success) {
        toast.success('Consulta excluída com sucesso.');
        setDeleteModalOpen(false);
        setQueryToDelete(null);
        fetchRecentQueries();
        refreshProfile();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao excluir consulta.');
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmClearAll = async () => {
    setDeleting(true);
    try {
      const response = await api.delete('/api/imobiliario/historico/limpar-tudo');
      if (response.data?.success) {
        toast.success(response.data.message || 'Histórico limpo com sucesso.');
        setClearAllModalOpen(false);
        fetchRecentQueries();
        refreshProfile();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao limpar histórico.');
    } finally {
      setDeleting(false);
    }
  };

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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const maskCpfCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  };

  const handleSelectQuery = (doc: string) => {
    const masked = maskCpfCnpj(doc);
    setDocumento(masked);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    handleSearch(masked);
  };

  // Se vier parâmetro na URL (?doc=...), busca automaticamente
  useEffect(() => {
    const docParam = searchParams.get('doc');
    if (docParam && docParam !== documento && !loading && !result) {
      const masked = maskCpfCnpj(docParam);
      setDocumento(masked);
      handleSearch(masked);
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
        // Atualiza lista de consultas recentes
        fetchRecentQueries();
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
      {/* Bloco de Busca Centralizado */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-12 shadow-xs flex flex-col items-center justify-center text-center">
        <div className="max-w-2xl mx-auto w-full flex flex-col items-center text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center">
            <Building className="w-7 h-7 mr-2.5 text-blue-600" />
            Consulta
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-2 max-w-lg mx-auto leading-relaxed">
            Informe o CPF ou CNPJ para pesquisar o histórico de titularidade e registros imobiliários.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="mt-8 w-full max-w-xl mx-auto flex flex-col sm:flex-row gap-3 items-center justify-center"
          >
            <div className="relative w-full flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={documento}
                onChange={(e) => setDocumento(maskCpfCnpj(e.target.value))}
                maxLength={18}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                className="w-full bg-white border border-slate-300 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition font-mono shadow-2xs"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-8 py-3.5 rounded-2xl text-sm flex items-center justify-center transition shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
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

      {/* Histórico de Últimas Consultas Realizadas */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Histórico de Operações</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center">
              Últimas Consultas Realizadas
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Histórico recente de consultas executadas nesta conta com acesso imediato ao laudo pericial oficial.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {recentQueries.length > 0 && (
              <button
                onClick={() => setClearAllModalOpen(true)}
                className="inline-flex items-center px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200/80 transition cursor-pointer shadow-2xs"
                title="Limpar todo o histórico de consultas"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                Limpar Histórico
              </button>
            )}
            <button
              onClick={fetchRecentQueries}
              disabled={loadingQueries}
              className="inline-flex items-center px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition disabled:opacity-50 cursor-pointer shadow-2xs"
              title="Atualizar lista de consultas"
            >
              <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${loadingQueries ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Tabela de Consultas Recentes */}
        {loadingQueries && recentQueries.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <RotateCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p className="text-xs">Carregando histórico de consultas...</p>
          </div>
        ) : recentQueries.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <FileText className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">Nenhuma consulta realizada recentemente</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              As consultas realizadas pelo portal web ou pela API aparecerão aqui para acesso rápido.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Documento</th>
                  <th className="py-3 px-4">Canal</th>
                  <th className="py-3 px-4">Bens / Registros</th>
                  <th className="py-3 px-4">Data e Hora</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {recentQueries.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {formatDoc(q.identifier)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        q.source === 'API' 
                          ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {q.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {q.status === 'ERROR' ? (
                        <span className="inline-flex items-center text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200" title="Falha temporária ou timeout na consulta cartorária">
                          <AlertCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                          Falha na consulta
                        </span>
                      ) : q.totalDeclaracoes > 0 ? (
                        <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          {q.totalDeclaracoes} {q.totalDeclaracoes === 1 ? 'imóvel localizado' : 'imóveis localizados'}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">
                          Nenhum imóvel localizado
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {formatDate(q.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        {q.status !== 'ERROR' && (
                          <button
                            onClick={() => setSelectedQueryId(q.id)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition shadow-2xs cursor-pointer"
                            title="Visualizar laudo completo desta consulta"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Ver Laudo
                          </button>
                        )}
                        <button
                          onClick={() => handleSelectQuery(q.identifier)}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                          title="Carregar e pesquisar este documento novamente"
                        >
                          <Search className="w-3.5 h-3.5 mr-1" />
                          Reconsultar
                        </button>
                        <button
                          onClick={() => {
                            setQueryToDelete({ id: q.id, identifier: q.identifier });
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Excluir consulta do histórico"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes da Consulta / Laudo */}
      <DetalhesConsultaModal
        isOpen={!!selectedQueryId}
        queryId={selectedQueryId}
        onClose={() => setSelectedQueryId(null)}
      />

      {/* Modal de Confirmação de Exclusão Individual (Ação Irreversível) */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Excluir Consulta do Histórico"
        description={
          <div className="space-y-3">
            <p className="text-slate-600">
              Tem certeza de que deseja excluir o registro de consulta do documento <strong className="font-mono text-slate-900 font-bold">{formatDoc(queryToDelete?.identifier || '')}</strong>?
            </p>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Atenção: Ação Irreversível</strong>
                <span>Esta consulta e o respectivo laudo pericial serão apagados permanentemente do seu histórico.</span>
              </div>
            </div>
          </div>
        }
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!deleting) {
            setDeleteModalOpen(false);
            setQueryToDelete(null);
          }
        }}
      />

      {/* Modal de Confirmação para Limpar Todo o Histórico (Ação Irreversível) */}
      <ConfirmModal
        isOpen={clearAllModalOpen}
        title="Limpar Todo o Histórico de Consultas"
        description={
          <div className="space-y-3">
            <p className="text-slate-600">
              Tem certeza de que deseja apagar <strong>todas as {recentQueries.length} consultas</strong> do seu histórico?
            </p>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Atenção: Ação Totalmente Irreversível</strong>
                <span>Todos os laudos periciais salvos serão permanentemente excluídos da sua conta. Não será possível recuperá-los.</span>
              </div>
            </div>
          </div>
        }
        confirmText="Sim, Limpar Tudo"
        cancelText="Cancelar"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmClearAll}
        onClose={() => {
          if (!deleting) setClearAllModalOpen(false);
        }}
      />
    </div>
  );
}
