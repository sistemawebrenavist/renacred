import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Search, 
  ExternalLink, 
  Eye, 
  Copy, 
  Check, 
  FileText, 
  X, 
  Code, 
  AlertCircle, 
  Building, 
  CheckCircle2, 
  ArrowUpRight, 
  RefreshCw,
  Clock,
  DollarSign,
  Shield,
  Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../services/api';

interface ParsedEndpoint {
  cleanPath: string;
  query: string;
  serviceName: string;
  productCode: string;
  tokenPresent: boolean;
}

function parseApiEndpoint(endpoint: string): ParsedEndpoint {
  if (!endpoint) {
    return { cleanPath: '-', query: '', serviceName: 'Consulta API', productCode: 'E1', tokenPresent: false };
  }

  try {
    const [rawPath, queryString] = endpoint.split('?');
    const params = new URLSearchParams(queryString || '');

    const query = 
      params.get('query') || 
      params.get('q') || 
      params.get('documento') || 
      params.get('doc') || 
      params.get('parametro') || 
      params.get('cpf') || 
      params.get('cnpj') || 
      params.get('placa') || 
      params.get('chassi') || 
      params.get('renavam') || 
      '';

    const tokenPresent = params.has('token');

    let serviceName = 'Consulta API';
    let productCode = 'E1';
    const p = rawPath.toLowerCase();

    if (p.includes('/imobiliario/historico') || p.includes('/e1') || p.includes('historico')) {
      serviceName = 'E1 - Histórico Imobiliário';
      productCode = 'E1';
    } else if (p.includes('/e2') || p.includes('/protestos')) {
      serviceName = 'E2 - Protestos em Cartório';
      productCode = 'E2';
    } else if (p.includes('/e3') || p.includes('/processos')) {
      serviceName = 'E3 - Processos Judiciais';
      productCode = 'E3';
    } else if (p.includes('/e4') || p.includes('/imoveis')) {
      serviceName = 'E4 - Busca de Bens Imóveis';
      productCode = 'E4';
    } else if (p.includes('/e5') || p.includes('/veiculos')) {
      serviceName = 'E5 - Bens Veiculares';
      productCode = 'E5';
    } else if (p.includes('/e6') || p.includes('/societario')) {
      serviceName = 'E6 - Participações Societárias';
      productCode = 'E6';
    } else if (p.includes('/e7') || p.includes('/cadastral')) {
      serviceName = 'E7 - Dados Cadastrais & Receita';
      productCode = 'E7';
    } else if (p.includes('/e8') || p.includes('/dividas')) {
      serviceName = 'E8 - Dívidas Ativas e Fiscais';
      productCode = 'E8';
    } else if (p.includes('/e9') || p.includes('/financeiro')) {
      serviceName = 'E9 - Score & Perfil Financeiro';
      productCode = 'E9';
    } else if (p.includes('/e10') || p.includes('/obito')) {
      serviceName = 'E10 - Certidão de Óbito';
      productCode = 'E10';
    } else if (p.includes('/e11') || p.includes('/cnh')) {
      serviceName = 'E11 - Prontuário CNH & Condutor';
      productCode = 'E11';
    } else if (p.includes('/e12') || p.includes('/localizacao')) {
      serviceName = 'E12 - Localização & Contatos';
      productCode = 'E12';
    } else if (p.includes('/e13') || p.includes('/parentes')) {
      serviceName = 'E13 - Relacionamentos & Parentes';
      productCode = 'E13';
    } else if (p.includes('/e14') || p.includes('/trabalhista')) {
      serviceName = 'E14 - Vínculos Trabalhistas & CBO';
      productCode = 'E14';
    } else if (p.includes('/e15') || p.includes('/pesquisa-bens')) {
      serviceName = 'E15 - Dossiê de Bens & Patrimônio';
      productCode = 'E15';
    } else if (p.includes('/e16') || p.includes('/completa') || p.includes('/dossie')) {
      serviceName = 'E16 - Dossiê Investigativo Integral';
      productCode = 'E16';
    } else {
      const clean = rawPath.replace(/^\/api\//, '').replace(/^\/v1\//, '').replace(/\/+/g, ' ');
      serviceName = clean ? clean.toUpperCase() : 'ENDPOINT API';
    }

    return {
      cleanPath: rawPath,
      query: query.trim(),
      serviceName,
      productCode,
      tokenPresent
    };
  } catch (e) {
    return {
      cleanPath: endpoint,
      query: '',
      serviceName: 'API Endpoint',
      productCode: 'E1',
      tokenPresent: false
    };
  }
}

function formatDocumentDisplay(val: string): string {
  if (!val) return '-';
  const clean = val.replace(/[^a-zA-Z0-9]/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  if (clean.length === 7 && /^[A-Za-z]{3}[0-9][A-Za-z0-9][0-9]{2}$/.test(clean)) {
    return clean.toUpperCase();
  }
  return val;
}

export default function LogsApi() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedJson, setCopiedJson] = useState(false);

  // Modal de visualização da resposta da consulta
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'laudo' | 'json'>('laudo');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [selectedParsed, setSelectedParsed] = useState<ParsedEndpoint | null>(null);
  const [queryResponseData, setQueryResponseData] = useState<any | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/logs?limit=100');
      if (res.data?.success) {
        setLogs(res.data.data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar logs:', err);
      toast.error('Erro ao carregar histórico de logs da API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleOpenQueryResponse = async (log: any, parsed: ParsedEndpoint) => {
    setSelectedLog(log);
    setSelectedParsed(parsed);
    setIsModalOpen(true);
    setModalLoading(true);
    setActiveTab('laudo');
    setQueryResponseData(null);

    try {
      const companyId = log.companyId || log.apiKey?.companyId || '';
      const targetQuery = parsed.query || '';
      const res = await api.get('/api/admin/logs/response', {
        params: {
          logId: log.id,
          identifier: targetQuery,
          companyId: companyId
        }
      });

      if (res.data?.success) {
        setQueryResponseData(res.data);
      } else {
        setQueryResponseData({
          found: false,
          message: res.data?.message || 'Consulta não localizada.'
        });
      }
    } catch (err: any) {
      console.error('Erro ao carregar resposta da consulta:', err);
      setQueryResponseData({
        found: false,
        message: err.response?.data?.message || 'Erro de comunicação ao obter os dados desta consulta.'
      });
    } finally {
      setModalLoading(false);
    }
  };

  const handleCopyJson = (content: any) => {
    try {
      const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      navigator.clipboard.writeText(text);
      setCopiedJson(true);
      toast.success('JSON copiado para a área de transferência!');
      setTimeout(() => setCopiedJson(false), 2000);
    } catch (e) {
      toast.error('Falha ao copiar JSON.');
    }
  };

  const handleOpenInHub = () => {
    if (!selectedParsed) return;
    const prod = selectedParsed.productCode.toLowerCase();
    const doc = selectedParsed.query || '';
    const queryId = queryResponseData?.query?.id;

    let url = `/consultar?produto=${prod}&doc=${encodeURIComponent(doc)}`;
    if (queryId) {
      url += `&queryId=${queryId}`;
    } else {
      url += '&auto=true';
    }

    navigate(url);
  };

  // Filtragem rápida por texto
  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const term = searchTerm.toLowerCase();
    return logs.filter((l) => {
      const parsed = parseApiEndpoint(l.endpoint);
      const companyName = l.apiKey?.company?.razaoSocial?.toLowerCase() || '';
      const cnpjCpf = l.apiKey?.company?.cnpjCpf?.toLowerCase() || '';
      const ip = l.ipAddress?.toLowerCase() || '';
      return (
        parsed.query.toLowerCase().includes(term) ||
        parsed.serviceName.toLowerCase().includes(term) ||
        parsed.cleanPath.toLowerCase().includes(term) ||
        companyName.includes(term) ||
        cnpjCpf.includes(term) ||
        ip.includes(term)
      );
    });
  }, [logs, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
              <Activity className="w-6 h-6 mr-2.5 text-blue-600" />
              Auditoria & Histórico de Consultas da API
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              Monitoramento em tempo real de chamadas feitas pelos clientes via API, com visualização direta do laudo e resposta retornada.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar por documento, empresa, endpoint ou IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>
          <div className="text-xs text-slate-400 ml-auto self-end sm:self-center">
            Exibindo <span className="font-semibold text-slate-700">{filteredLogs.length}</span> registros
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
            Carregando histórico de auditoria...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400">
            Nenhuma consulta registrada encontrada para os filtros atuais.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs table-fixed">
              <thead className="text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/80 text-[11px]">
                <tr>
                  <th className="py-3.5 px-3 w-[70px] text-center">Status</th>
                  <th className="py-3.5 px-4 w-[240px]">Serviço</th>
                  <th className="py-3.5 px-4 w-[170px]">Consulta / Alvo</th>
                  <th className="py-3.5 px-4 w-[190px]">Empresa</th>
                  <th className="py-3.5 px-3 w-[85px] text-center">Tempo</th>
                  <th className="py-3.5 px-3 w-[85px] text-center">Valor</th>
                  <th className="py-3.5 px-3 w-[105px] text-center">Origem (IP)</th>
                  <th className="py-3.5 px-4 w-[130px] text-right">Data/Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((l) => {
                  const parsed = parseApiEndpoint(l.endpoint);
                  const isSuccess = l.statusCode >= 200 && l.statusCode < 300;
                  const isPost = (l.method || 'GET').toUpperCase() === 'POST';

                  return (
                    <tr key={l.id} className="hover:bg-slate-50/90 transition-colors">
                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {l.statusCode}
                        </span>
                      </td>

                      {/* Serviço (Coluna 1 Reduzida e Limpa) */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase shrink-0 ${
                                isPost
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}
                            >
                              {l.method || 'GET'}
                            </span>
                            <span className="font-semibold text-slate-900 truncate" title={parsed.serviceName}>
                              {parsed.serviceName}
                            </span>
                          </div>
                          <span
                            className="text-[11px] text-slate-400 font-mono truncate max-w-[210px] mt-0.5"
                            title={parsed.cleanPath}
                          >
                            {parsed.cleanPath}
                          </span>
                        </div>
                      </td>

                      {/* Consulta / Alvo com Link para Visualização */}
                      <td className="py-3 px-4">
                        {parsed.query ? (
                          <button
                            type="button"
                            onClick={() => handleOpenQueryResponse(l, parsed)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/90 hover:bg-blue-100 text-blue-700 hover:text-blue-800 font-mono font-semibold text-xs border border-blue-200/80 transition group cursor-pointer"
                            title="Clique para visualizar o laudo e a resposta exata da consulta"
                          >
                            <Search className="w-3 h-3 text-blue-500 group-hover:scale-110 transition-transform shrink-0" />
                            <span className="truncate max-w-[105px]">{formatDocumentDisplay(parsed.query)}</span>
                            <ExternalLink className="w-3 h-3 text-blue-400 group-hover:text-blue-700 shrink-0 ml-0.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenQueryResponse(l, parsed)}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-600 transition"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver log</span>
                          </button>
                        )}
                      </td>

                      {/* Empresa */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span
                            className="font-medium text-slate-800 truncate max-w-[170px]"
                            title={l.apiKey?.company?.razaoSocial || 'Desconhecida'}
                          >
                            {l.apiKey?.company?.razaoSocial || 'Desconhecida'}
                          </span>
                          {l.apiKey?.company?.cnpjCpf && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatDocumentDisplay(l.apiKey.company.cnpjCpf)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tempo */}
                      <td className="py-3 px-3 text-center text-slate-600 font-mono text-[11px]">
                        {l.responseTimeMs}ms
                      </td>

                      {/* Valor */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-semibold font-mono text-[11px] ${
                            Number(l.creditsUsed) > 0 ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          R$ {Number(l.creditsUsed).toFixed(2)}
                        </span>
                      </td>

                      {/* Origem (IP) */}
                      <td
                        className="py-3 px-3 text-center text-slate-500 font-mono text-[10px] truncate max-w-[100px]"
                        title={l.ipAddress || '-'}
                      >
                        {l.ipAddress ? l.ipAddress.replace(/^::ffff:/, '') : '-'}
                      </td>

                      {/* Data / Hora */}
                      <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                        {new Date(l.createdAt).toLocaleDateString('pt-BR')}
                        <span className="block text-[10px] text-slate-400">
                          {new Date(l.createdAt).toLocaleTimeString('pt-BR')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Visualização da Resposta da Consulta */}
      {isModalOpen && selectedLog && selectedParsed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Resposta da Consulta da API
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        selectedLog.statusCode >= 200 && selectedLog.statusCode < 300
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      HTTP {selectedLog.statusCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Alvo pesquisado:{' '}
                    <span className="font-semibold text-slate-800 font-mono">
                      {formatDocumentDisplay(selectedParsed.query) || 'Sem parâmetro direto'}
                    </span>{' '}
                    • Serviço:{' '}
                    <span className="font-semibold text-blue-700">{selectedParsed.serviceName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Subheader / KPI Overview */}
            <div className="px-6 py-3.5 bg-slate-100/50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Empresa Cliente</span>
                <span className="text-xs font-semibold text-slate-900 truncate block mt-0.5">
                  {selectedLog.apiKey?.company?.razaoSocial || 'Desconhecida'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Tempo de Resposta</span>
                <span className="text-xs font-semibold text-slate-900 font-mono mt-0.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  {selectedLog.responseTimeMs} ms
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Créditos Cobrados</span>
                <span className="text-xs font-semibold text-emerald-700 font-mono mt-0.5 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  R$ {Number(selectedLog.creditsUsed).toFixed(2)}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Data e Origem (IP)</span>
                <span className="text-xs font-semibold text-slate-700 font-mono block mt-0.5 truncate" title={selectedLog.ipAddress}>
                  {selectedLog.ipAddress ? selectedLog.ipAddress.replace(/^::ffff:/, '') : 'IP Padrão'}
                </span>
              </div>
            </div>

            {/* Modal Body Tabs */}
            <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-200 bg-white shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('laudo')}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'laudo'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                Resumo do Laudo & Dados
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('json')}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'json'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Code className="w-4 h-4" />
                Payload JSON Completo
              </button>
            </div>

            {/* Content Scroll Area */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {modalLoading ? (
                <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                  Localizando dados e resposta do cliente...
                </div>
              ) : queryResponseData?.found && queryResponseData?.query?.resultData ? (
                <div>
                  {activeTab === 'laudo' ? (
                    <div className="space-y-4">
                      {/* Card de Resumo de Identificação */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          Resultado da Pesquisa Localizado
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <span className="text-[11px] text-slate-500 block">Identificador Consultado</span>
                            <span className="text-sm font-bold text-slate-900 font-mono">
                              {formatDocumentDisplay(queryResponseData.query.identifier)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 block">Total de Ocorrências / Registros</span>
                            <span className="text-sm font-bold text-blue-700 font-mono">
                              {queryResponseData.query.totalDeclaracoes ??
                                (Array.isArray(queryResponseData.query.resultData?.declaracoes)
                                  ? queryResponseData.query.resultData.declaracoes.length
                                  : queryResponseData.query.resultData?.total_declaracoes || 0)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 block">Status da Consulta</span>
                            <span className="text-sm font-bold text-emerald-700">
                              {queryResponseData.query.status || 'COMPLETED'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Visualizador Estruturado dos Dados */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Dados Principais Retornados
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            Fonte Oficial: {queryResponseData.query.source || 'API'}
                          </span>
                        </div>

                        {/* Extração amigável de campos caso existam */}
                        {(() => {
                          const r = queryResponseData.query.resultData;
                          const d = r.dados || r;
                          const nome = d.nome || d.razao_social || r.nome || null;
                          const doc = d.cpf || d.cnpj || r.cpf || r.cnpj || null;
                          const declaracoes = Array.isArray(r.declaracoes) ? r.declaracoes : null;

                          return (
                            <div className="space-y-4">
                              {(nome || doc) && (
                                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                                  {nome && (
                                    <div className="text-sm font-bold text-slate-900">{nome}</div>
                                  )}
                                  {doc && (
                                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                                      Documento: {formatDocumentDisplay(doc)}
                                    </div>
                                  )}
                                </div>
                              )}

                              {declaracoes && declaracoes.length > 0 ? (
                                <div className="space-y-2">
                                  <span className="text-xs font-semibold text-slate-700 block">
                                    Declarações / Registros Cartorários ({declaracoes.length})
                                  </span>
                                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {declaracoes.map((item: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1"
                                      >
                                        <div className="flex items-center justify-between font-semibold text-slate-800">
                                          <span>{item.natureza || item.tipo || `Registro #${idx + 1}`}</span>
                                          {item.valor && (
                                            <span className="text-emerald-700 font-mono">
                                              R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                          )}
                                        </div>
                                        {item.cartorio && (
                                          <div className="text-[11px] text-slate-500">Cartório: {item.cartorio}</div>
                                        )}
                                        {item.municipio && (
                                          <div className="text-[11px] text-slate-500">
                                            Local: {item.municipio} - {item.uf || ''}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                                  Consulta processada com sucesso. Para ver a íntegra das seções periciais ou imprimir a certidão, clique em{' '}
                                  <span className="font-semibold text-blue-700">"Abrir Laudo Oficial no Hub"</span>.
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    /* Tab JSON Bruto */
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500">
                          JSON retornado na resposta HTTP {selectedLog.statusCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyJson(queryResponseData.query.resultData)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition cursor-pointer"
                        >
                          {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedJson ? 'Copiado!' : 'Copiar JSON'}
                        </button>
                      </div>
                      <pre className="p-4 bg-slate-950 text-emerald-400 rounded-2xl text-xs font-mono overflow-x-auto max-h-[420px] border border-slate-800 leading-relaxed">
                        {JSON.stringify(queryResponseData.query.resultData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                /* Caso não tenha resultado salvo no banco */
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 mx-auto flex items-center justify-center text-amber-700">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-amber-900">
                    Log auditado com sucesso (HTTP {selectedLog.statusCode})
                  </h4>
                  <p className="text-xs text-amber-700 max-w-lg mx-auto">
                    {queryResponseData?.message ||
                      'Esta requisição de API foi concluída e tarifada, mas o laudo não se encontra em cache temporário. Você pode abri-la ou executá-la diretamente no Hub de Consultas Oficial.'}
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleOpenInHub}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Visualizar no Hub de Consulta Oficial
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-[11px] text-slate-400">
                Endpoint:{' '}
                <span className="font-mono text-slate-600">{selectedParsed.cleanPath}</span>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleOpenInHub}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir Laudo Oficial no Hub
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
