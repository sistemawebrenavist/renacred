import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Car,
  Search,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  Zap,
  Clock,
  Eye,
  FileText,
  Trash2,
  MapPin,
  User,
  Building
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { ExportPdfVeicularButton } from '../../components/veicular/ExportPdfVeicularButton';
import { ExportExcelVeicularButton } from '../../components/veicular/ExportExcelVeicularButton';
import { ProprietarioTimelineCard } from '../../components/veicular/ProprietarioTimelineCard';
import DetalhesConsultaModal from '../../components/imobiliario/DetalhesConsultaModal';
import ConfirmModal from '../../components/ui/ConfirmModal';

// Cache em memória de sessão para resposta instantânea (0ms)
const sessionVeicularCache = new Map<string, any>();

const PROGRESS_STEPS = [
  { label: 'Conectando ao Registro Nacional de Veículos e bases oficiais...', progress: 30 },
  { label: 'Mapeando histórico de transferências e cadeia dominial de proprietários...', progress: 65 },
  { label: 'Compilando e validando laudo pericial veicular...', progress: 90 },
];

export default function ConsultarProprietarios() {
  const { refreshProfile } = useAuth();

  const [placa, setPlaca] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [fromCache, setFromCache] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  // Histórico de Últimas Consultas E2
  const [recentQueries, setRecentQueries] = useState<any[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);

  // Modais de Exclusão
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [queryToDelete, setQueryToDelete] = useState<{ id: string; identifier: string } | null>(null);
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const stepTimerRef = useRef<any>(null);

  // Formatação amigável de placa enquanto digita
  const handlePlacaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (val.length > 7) val = val.slice(0, 7);
    
    // Se for placa antiga (3 letras + 4 números), formata com hífen para melhor visualização
    if (val.length > 3 && /^[A-Z]{3}[0-9]/.test(val)) {
      val = `${val.slice(0, 3)}-${val.slice(3)}`;
    }
    setPlaca(val);
  };

  const fetchRecentQueries = async () => {
    setLoadingQueries(true);
    try {
      const response = await api.get('/api/veicular/historico?page=1&limit=10');
      if (response.data?.success) {
        setRecentQueries(response.data.data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar últimas consultas veiculares:', err);
    } finally {
      setLoadingQueries(false);
    }
  };

  useEffect(() => {
    fetchRecentQueries();
  }, []);

  const handleSearch = async (e?: React.FormEvent, directPlaca?: string) => {
    if (e) e.preventDefault();
    const queryPlaca = (directPlaca || placa).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    if (!queryPlaca) {
      toast.error('Informe a placa do veículo para consultar.');
      return;
    }

    if (queryPlaca.length !== 7) {
      toast.error('A placa deve conter exatamente 7 caracteres (padrão antigo ou Mercosul).');
      return;
    }

    // 1. Checar Cache de Sessão Instantâneo (0ms)
    const cached = sessionVeicularCache.get(queryPlaca);
    if (cached) {
      setFromCache(true);
      setResult(cached);
      toast.info(`Laudo recuperado instantaneamente da sessão (${queryPlaca})`);
      return;
    }

    setLoading(true);
    setFromCache(false);
    setResult(null);
    setCurrentStepIndex(0);

    // Animação de etapas de progresso
    stepTimerRef.current = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev));
    }, 1400);

    try {
      const response = await api.post('/api/veicular/proprietarios', { placa: queryPlaca });

      if (response.data?.success) {
        const data = response.data.data;
        setResult(data);
        sessionVeicularCache.set(queryPlaca, data);

        const totalEncontrado = data.total !== undefined ? data.total : (data.historico ? data.historico.length : 0);
        if (totalEncontrado > 0) {
          toast.success(`Laudo concluído: ${totalEncontrado} registros de proprietários localizados.`);
        } else {
          toast.info('Nenhum registro de proprietário localizado para esta placa.');
        }

        refreshProfile();
        fetchRecentQueries();
      } else {
        toast.error(response.data?.message || 'Falha ao processar consulta veicular.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro de conexão ao consultar a base veicular.';
      toast.error(msg);
    } finally {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      setLoading(false);
    }
  };

  const handleRequery = (targetPlaca: string) => {
    setPlaca(targetPlaca);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    handleSearch(undefined, targetPlaca);
  };

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

  // Ordenação garantida cronológica da mais antiga para a mais recente
  const historicoOrdenado = useMemo(() => {
    if (!result?.historico || !Array.isArray(result.historico)) return [];
    const list = [...result.historico];
    
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

    list.sort((a, b) => {
      const timeA = parseDataHora(a.data, a.hora);
      const timeB = parseDataHora(b.data, b.hora);
      return timeA - timeB; // Ascendente: da mais antiga para a mais recente
    });

    return list;
  }, [result?.historico]);

  const proprietarioAtual = result?.proprietario_atual || historicoOrdenado.find((h: any) => h.atual);
  const totalRegistros = result?.total !== undefined ? result.total : historicoOrdenado.length;

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

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header Corporativo do Produto E2 */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shadow-xs">
              <Car className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono bg-emerald-100/90 text-emerald-900 border border-emerald-300">
                  PRODUTO E2
                </span>
                <span className="text-xs font-semibold text-slate-500">•</span>
                <span className="text-xs font-semibold text-slate-600">Base Registro Nacional Veicular</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                E2 - Histórico de Proprietários por Placa
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Auditoria pericial da cadeia dominial, transferências de propriedade e histórico completo de proprietários veiculares em todo o Brasil.
              </p>
            </div>
          </div>
        </div>

        {/* Formulário de Busca por Placa */}
        <form onSubmit={handleSearch} className="mt-8 max-w-3xl">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={placa}
                onChange={handlePlacaChange}
                placeholder="Informe a Placa (ex: ATT0849 ou ATT0I49)"
                disabled={loading}
                maxLength={8}
                className="w-full h-12 pl-4 pr-12 rounded-2xl border border-slate-300 bg-white text-slate-900 text-sm font-mono tracking-wider font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition shadow-xs"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Car className="w-5 h-5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !placa}
              className="h-12 px-6 rounded-2xl bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:bg-slate-300 text-white font-semibold text-xs transition shadow-xs flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin mr-2" />
                  <span>Consultando...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  <span>Consultar Proprietários</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 px-1">
            <span>Aceita placas convencionais (ABC-1234) e padrão Mercosul (ABC1D23)</span>
            <span className="font-semibold text-emerald-700">Sem dados localizados = Custo R$ 0,00</span>
          </div>
        </form>
      </div>

      {/* Feedback de Progresso / Loading */}
      {loading && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-xs space-y-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
            <RotateCw className="w-6 h-6 animate-spin" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base font-bold text-slate-900">
              {PROGRESS_STEPS[currentStepIndex].label}
            </h3>
            <p className="text-xs text-slate-500">
              Aguarde enquanto a cadeia dominial de registros veiculares é compilada...
            </p>
          </div>

          {/* Barra de Progresso */}
          <div className="max-w-md mx-auto w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${PROGRESS_STEPS[currentStepIndex].progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Resultados da Consulta (PRODUTO E2) */}
      {!loading && result && (
        <div className="space-y-6">
          {/* Banner de Resumo da Consulta */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono bg-emerald-100 text-emerald-900 border border-emerald-300">
                  PRODUTO E2
                </span>
                <span className="text-xs text-slate-500 font-medium">Veículo:</span>
                <span className="text-sm font-bold font-mono text-slate-900">
                  {result.placa}
                </span>
                {result.renavam && (
                  <span className="text-xs text-slate-500 font-mono">
                    • Renavam: <strong className="text-slate-800">{result.renavam}</strong>
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {totalRegistros} proprietários localizados
                </span>
                {fromCache && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    <Zap className="w-3 h-3 mr-1" />
                    Instantâneo (0ms)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Data da Auditoria: {new Date(result.consulta_em || Date.now()).toLocaleString('pt-BR')}
              </p>
            </div>

            {historicoOrdenado.length > 0 && (
              <div className="flex items-center space-x-2">
                <ExportExcelVeicularButton
                  placa={result.placa}
                  renavam={result.renavam}
                  historico={historicoOrdenado}
                />
                <ExportPdfVeicularButton
                  placa={result.placa}
                  renavam={result.renavam}
                  total={totalRegistros}
                  proprietarioAtual={proprietarioAtual}
                  historico={historicoOrdenado}
                />
              </div>
            )}
          </div>

          {/* Card Executivo de Destaque: Proprietário Atual Vigente */}
          {proprietarioAtual && (
            <div className="bg-gradient-to-br from-emerald-50/50 via-white to-white border border-emerald-200 rounded-3xl p-6 sm:p-7 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-emerald-100">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-700 text-white shadow-xs">
                    PROPRIETÁRIO ATUAL VIGENTE
                  </span>
                  <span className="text-xs font-semibold text-emerald-900/70">Titular Ativo do Veículo</span>
                </div>
                <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-100/60 px-3 py-0.5 rounded-full border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 mr-2 animate-pulse" />
                  Titularidade Vigente
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">Nome do Titular Atual:</span>
                  <div className="flex items-center mt-1">
                    <User className="w-4 h-4 mr-2 text-emerald-700 shrink-0" />
                    <span className="font-extrabold text-slate-900 text-base">
                      {proprietarioAtual.nome || 'NÃO INFORMADO'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">Documento Identificador:</span>
                  <div className="flex items-center gap-2 mt-1 font-mono">
                    <span className="font-bold text-slate-900 text-sm">
                      {formatDoc(proprietarioAtual.documento)}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-sans font-medium bg-slate-100 text-slate-600">
                      {proprietarioAtual.tipo || 'Pessoa'}
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center text-slate-700 text-xs">
                    <MapPin className="w-4 h-4 mr-1.5 text-slate-400" />
                    <span className="font-semibold">{proprietarioAtual.municipio || 'MUNICÍPIO NÃO INFORMADO'}</span>
                    {proprietarioAtual.uf && <span className="ml-1 font-bold text-slate-500">/ {proprietarioAtual.uf}</span>}
                  </div>
                  {proprietarioAtual.evento && (
                    <span className="text-xs text-slate-500 font-mono">
                      Último Evento: {proprietarioAtual.evento}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Linha do Tempo / Timeline Cronológica Ascendente */}
          {historicoOrdenado.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 shadow-xs">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">Nenhum histórico de transferências localizado</p>
              <p className="text-xs text-slate-500 mt-1">
                Não constam registros de transferências de propriedade para a placa informada na base oficial.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Cadeia Dominial Cronológica ({historicoOrdenado.length} registros)
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Ordenado da 1ª aquisição registrada até o proprietário vigente
                </span>
              </div>

              {/* Renderização da Linha do Tempo */}
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
        </div>
      )}

      {/* Histórico das Últimas Consultas E2 Realizadas */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Últimas Consultas de Proprietários Realizadas
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Histórico das últimas pesquisas veiculares da sua empresa com acesso direto ao laudo.
            </p>
          </div>
        </div>

        {loadingQueries ? (
          <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
            <RotateCw className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Carregando histórico...</span>
          </div>
        ) : recentQueries.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
            Nenhuma consulta veicular realizada até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium">
                  <th className="pb-3 pl-2">Placa</th>
                  <th className="pb-3">Canal</th>
                  <th className="pb-3">Registros</th>
                  <th className="pb-3">Data e Hora</th>
                  <th className="pb-3 text-right pr-2">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {recentQueries.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 pl-2 font-mono font-bold text-slate-900">
                      {q.identifier}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 text-slate-600 border border-slate-200">
                        {q.source}
                      </span>
                    </td>
                    <td className="py-3">
                      {q.status === 'ERROR' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Falha
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {q.totalDeclaracoes || 0} proprietários
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-slate-500 font-mono">
                      {new Date(q.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 text-right pr-2">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setSelectedQueryId(q.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition flex items-center space-x-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          <span>Ver Laudo</span>
                        </button>
                        <button
                          onClick={() => handleRequery(q.identifier)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold transition cursor-pointer"
                        >
                          Reconsultar
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

      {/* Modal Polimórfico de Detalhes da Consulta (E2 / E1) */}
      <DetalhesConsultaModal
        isOpen={!!selectedQueryId}
        queryId={selectedQueryId}
        onClose={() => setSelectedQueryId(null)}
      />

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Excluir Consulta Veicular"
        description={`Tem certeza que deseja excluir o laudo da placa ${queryToDelete?.identifier}?`}
        confirmText="Sim, excluir"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
