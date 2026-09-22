import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Building2,
  Clock,
  ArrowRight,
  RotateCw,
  Activity,
  FileCode2,
  DollarSign,
  ShieldCheck,
  Calendar,
  Layers,
  CheckCircle2,
  ExternalLink,
  Eye,
  KeyRound,
  FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import DetalhesConsultaModal from '../../components/imobiliario/DetalhesConsultaModal';

export default function DashboardCliente() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/imobiliario/metrics');
      if (response.data?.success) {
        setMetrics(response.data.data);
      }
    } catch (err) {
      console.error('Erro ao carregar métricas do assinante:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const company = metrics?.company || user?.company;
  const isPostPaid = company?.accountType === 'POST_PAID';
  const recentQueries = metrics?.recentQueries || [];

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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Cabeçalho Executivo do Dashboard */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-[#1D4ED8] text-xs font-bold uppercase tracking-wider mb-2">
            <Activity className="w-4 h-4" />
            <span>Indicadores & Inteligência de Dados</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Visão Geral da Conta
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Acompanhamento analítico de consumo, registros imobiliários localizados e integridade da integração.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchMetrics}
            title="Atualizar métricas"
            className="p-2.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition shadow-xs"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/consultar"
            className="bg-[#1D4ED8] hover:bg-[#1E40AF] active:bg-[#172554] text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center transition shadow-xs"
          >
            <Search className="w-4 h-4 mr-2" />
            Nova Pesquisa Imobiliária
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Link>
        </div>
      </div>

      {/* Banner de Ação Rápida Objetivo (Sem formulário duplicado) */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-7 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-[#1D4ED8]" />
            <span>Serviço Oficial Cartorário & DOI</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Pesquisa e Rastreio de Histórico Imobiliário Nacional
          </h3>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Consulte escrituras, matrículas, compras, vendas e titularidades vinculadas a qualquer CPF ou CNPJ com emissão de laudo pericial oficial e exportação para PDF e Excel.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Link
            to="/consultar"
            className="inline-flex items-center px-6 py-3 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-bold rounded-xl text-xs transition shadow-xs group"
          >
            <Search className="w-4 h-4 mr-2" />
            Ir para Consulta de Imóveis
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" />
          </Link>
        </div>
      </div>

      {/* 4 Cards de Indicadores de Dados (KPIs Reais) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Consultas no Mês */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
            <span>Consultas no Mês</span>
            <Activity className="w-4 h-4 text-[#1D4ED8]" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 font-mono">
            {loading ? '...' : metrics?.queriesMonth || 0}
          </p>
          <div className="mt-2 flex items-center text-xs text-slate-500">
            <span className="font-semibold text-blue-700 mr-1.5 font-mono">
              {metrics?.queriesToday || 0}
            </span>
            <span>realizadas hoje</span>
          </div>
        </div>

        {/* Card 2: Declarações & Bens Localizados */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
            <span>Bens & Registros</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-700 font-mono">
            {loading ? '...' : metrics?.totalDeclaracoes || 0}
          </p>
          <span className="text-xs text-slate-500 mt-2 block">
            Declarações DOI e cartórios localizadas
          </span>
        </div>

        {/* Card 3: Faturamento ou Saldo */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
            <span>{isPostPaid ? 'Consumo no Mês' : 'Saldo Disponível'}</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 font-mono">
            R$ {loading ? '...' : (isPostPaid ? (metrics?.totalSpentMonth || 0) : (company?.creditsBalance || 0)).toFixed(2)}
          </p>
          <div className="mt-2 text-xs">
            {isPostPaid ? (
              <Link to="/minha-assinatura?tab=faturas" className="text-[#1D4ED8] hover:underline font-medium">
                Vencimento dia {company?.billingDueDate || 10} &rarr;
              </Link>
            ) : (
              <Link to="/minha-assinatura?tab=extrato" className="text-emerald-700 hover:underline font-medium">
                + Recarregar via Pix &rarr;
              </Link>
            )}
          </div>
        </div>

        {/* Card 4: Distribuição API vs Web */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
            <span>Canal Principal</span>
            <FileCode2 className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 font-mono">
            {loading ? '...' : `${metrics?.distribution?.apiPercent || 0}%`}
          </p>
          <span className="text-xs text-slate-500 mt-2 block">
            {metrics?.distribution?.api || 0} via API / {metrics?.distribution?.web || 0} via Web
          </span>
        </div>
      </div>

      {/* Painéis Secundários de Inteligência & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Distribuição de Tráfego de Consultas */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <Layers className="w-4 h-4 mr-2 text-[#1D4ED8]" />
              Distribuição por Canal
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">{metrics?.queriesTotal || 0} totais</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-600 mb-1 font-medium">
                <span>API Direta (Sistemas / ERP)</span>
                <span className="font-mono font-bold text-slate-900">{metrics?.distribution?.apiPercent || 0}% ({metrics?.distribution?.api || 0})</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#1D4ED8] h-full transition-all duration-500 rounded-full"
                  style={{ width: `${metrics?.distribution?.apiPercent || 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-600 mb-1 font-medium">
                <span>Portal Web (Navegador)</span>
                <span className="font-mono font-bold text-slate-900">{metrics?.distribution?.webPercent || 0}% ({metrics?.distribution?.web || 0})</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${metrics?.distribution?.webPercent || 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 leading-relaxed border-t border-slate-100">
            A plataforma processa requisições automáticas via API e manuais via Painel Web sob a mesma conta.
          </div>
        </div>

        {/* Card 2: Status da Integração API */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <KeyRound className="w-4 h-4 mr-2 text-[#1D4ED8]" />
              Status da API & Chaves
            </h4>
            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ● Online
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Chaves de API ativas:</span>
              <span className="font-bold text-slate-900 font-mono">{metrics?.apiKeysCount || 1} chave(s)</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Tempo de resposta:</span>
              <span className="font-bold text-emerald-700 font-mono">&lt; 900ms</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Endpoint em produção:</span>
              <span className="text-[11px] font-mono text-slate-700 font-medium">api.renacred.com.br/v1</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <Link to="/api-keys" className="text-xs font-semibold text-[#1D4ED8] hover:underline flex items-center">
              Gerenciar Chaves &rarr;
            </Link>
            <Link to="/docs" className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center">
              Documentação
            </Link>
          </div>
        </div>

        {/* Card 3: Modalidade & Condições Contratuais */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <ShieldCheck className="w-4 h-4 mr-2 text-amber-600" />
              Contrato & Faturamento
            </h4>
            <span className="text-xs font-bold text-slate-700">
              {isPostPaid ? 'Pós-pago' : 'Pré-pago'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Tarifa por consulta com dados:</span>
              <span className="font-bold text-emerald-700 font-mono">
                R$ {Number(company?.customQueryPrice || 5).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Cobrança sem dados:</span>
              <span className="font-bold text-emerald-700">Custo Zero (R$ 0,00)</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Vencimento da fatura:</span>
              <span className="font-bold text-slate-900">Dia {company?.billingDueDate || 10}</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <Link to="/minha-assinatura" className="text-xs font-semibold text-[#1D4ED8] hover:underline flex items-center">
              Ver Minha Assinatura &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Monitoramento de Consultas Recentes */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <Clock className="w-4 h-4 mr-2 text-[#1D4ED8]" />
              Monitoramento de Atividade Recente
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Últimas requisições processadas pela plataforma para a sua empresa.
            </p>
          </div>
          <Link to="/consultar" className="text-xs font-semibold text-[#1D4ED8] hover:underline flex items-center">
            Pesquisar novo imóvel &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Carregando atividade recente...</div>
        ) : recentQueries.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Nenhuma consulta realizada até o momento. Acesse a página <strong>Consultar Imóvel</strong> para efetuar sua primeira busca.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Documento Consultado</th>
                  <th className="py-3 px-4 font-semibold text-center">Canal</th>
                  <th className="py-3 px-4 font-semibold text-center">Declarações Localizadas</th>
                  <th className="py-3 px-4 font-semibold">Tarifa</th>
                  <th className="py-3 px-4 font-semibold">Data & Hora</th>
                  <th className="py-3 px-4 font-semibold text-right">Laudo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentQueries.map((q: any) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold font-mono text-slate-900">
                      {formatDoc(q.identifier)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        q.source === 'API' 
                          ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {q.source === 'API' ? 'API DIRETA' : 'PORTAL WEB'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        q.totalDeclaracoes > 0 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {q.totalDeclaracoes} {q.totalDeclaracoes === 1 ? 'imóvel' : 'imóveis'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold font-mono">
                      {Number(q.cost) > 0 ? (
                        <span className="text-emerald-700">R$ {Number(q.cost).toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-400">R$ 0,00</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {new Date(q.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedQueryId(q.id)}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-[#1D4ED8] hover:text-white hover:bg-[#1D4ED8] border border-blue-200 rounded-lg transition"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Ver Laudo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Laudo */}
      <DetalhesConsultaModal
        isOpen={!!selectedQueryId}
        queryId={selectedQueryId}
        onClose={() => setSelectedQueryId(null)}
      />
    </div>
  );
}
