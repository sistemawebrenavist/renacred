import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Building2,
  ArrowRight,
  RotateCw,
  Activity,
  FileCode2,
  DollarSign,
  ShieldCheck,
  Layers,
  KeyRound,
  LayoutGrid,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function DashboardCliente() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [activeApiKey, setActiveApiKey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const [metricsRes, keysRes] = await Promise.allSettled([
        api.get('/api/imobiliario/metrics'),
        api.get('/api/keys')
      ]);

      if (metricsRes.status === 'fulfilled' && metricsRes.value.data?.success) {
        const data = metricsRes.value.data.data;
        setMetrics(data);
        if (data?.activeApiKey) {
          setActiveApiKey(data.activeApiKey);
        }
      }

      if (keysRes.status === 'fulfilled' && keysRes.value.data?.success) {
        const keysList = keysRes.value.data.data || [];
        const active = keysList.find((k: any) => k.isActive) || keysList[0];
        if (active) {
          setActiveApiKey(active);
        }
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

  const handleCopyKey = (key: string) => {
    if (!key) return;
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const company = metrics?.company || user?.company;
  const isPostPaid = company?.accountType === 'POST_PAID';
  const currentKey = activeApiKey || metrics?.activeApiKey;

  const topProducts = (metrics?.topProducts && metrics.topProducts.length > 0)
    ? metrics.topProducts
    : [
        { code: 'E1', name: 'Pesquisa de Bens (DOI)', count: metrics?.totalDeclaracoes || metrics?.queriesTotal || 0 },
        { code: 'E2', name: 'Histórico Veicular', count: 0 },
        { code: 'E5', name: 'Cadastro Completo', count: 0 }
      ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Topo Limpo e Objetivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Visão Geral
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhe suas consultas, produtos mais utilizados e credenciais de integração.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchMetrics}
            title="Atualizar métricas"
            className="p-2.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition shadow-xs"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/produtos"
            className="bg-[#1D4ED8] hover:bg-[#1E40AF] active:bg-[#172554] text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center transition shadow-xs"
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Catálogo de Produtos
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Link>
        </div>
      </div>

      {/* 4 Cards de Indicadores de Dados (KPIs Reais e Relevantes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Consultas no Mês */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold uppercase mb-2">
            <span>Consultas no Mês</span>
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

        {/* Card 2: Top 3 Produtos Consultados */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="text-slate-500 text-xs font-semibold uppercase mb-2">
            <span>Top 3 Produtos</span>
          </div>

          <div className="space-y-1.5 my-auto">
            {topProducts.slice(0, 3).map((item: any, idx: number) => (
              <div key={item.code} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 truncate mr-2">
                  <span className="font-mono text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                  <span className="font-semibold text-slate-800 truncate" title={item.name}>
                    {item.code} · {item.name}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-700 shrink-0 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                  {item.count}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100 pt-1.5">
            <span>Bases mais acessadas</span>
            <Link to="/produtos" className="text-[#1D4ED8] hover:underline font-medium text-[11px]">
              Ver todas &rarr;
            </Link>
          </div>
        </div>

        {/* Card 3: Histórico Total de Consultas (Substitui Saldo que já está no Navbar) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold uppercase mb-2">
            <span>Total Histórico</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 font-mono">
            {loading ? '...' : (metrics?.queriesTotal || (metrics?.distribution?.api || 0) + (metrics?.distribution?.web || 0) || 0)}
          </p>
          <div className="mt-2 flex items-center text-xs text-slate-500">
            <span className="font-semibold text-emerald-700 mr-1.5 font-mono">
              100%
            </span>
            <span>certidões arquivadas</span>
          </div>
        </div>

        {/* Card 4: Distribuição API vs Web */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold uppercase mb-2">
            <span>Canal Principal</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 font-mono">
            {loading ? '...' : `${metrics?.distribution?.apiPercent || 0}%`}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{metrics?.distribution?.api || 0} via API</span>
            <span className="text-slate-300">•</span>
            <span>{metrics?.distribution?.web || 0} via Web</span>
          </div>
        </div>
      </div>

      {/* Cards de Chave de API & Contrato/Faturamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Chave de API & Integração */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                <KeyRound className="w-4 h-4 mr-2 text-[#1D4ED8]" />
                Chave de Acesso (API)
              </h4>
              <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                currentKey ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {currentKey ? '● Ativa' : 'Sem chave'}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {currentKey ? (
                <>
                  <div className="text-xs">
                    <span className="text-slate-500 block text-[11px]">Identificação da Chave:</span>
                    <span className="font-semibold text-slate-800 break-words mt-0.5 block leading-tight">
                      {currentKey.name || 'Chave Principal'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Código da Chave:</span>
                      <span className="text-[10px] text-emerald-600 font-medium">Liberada para uso</span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                      <span className="font-mono text-xs text-slate-800 truncate select-all mr-2">
                        {showKey
                          ? currentKey.key
                          : (currentKey.key ? `${currentKey.key.slice(0, 14)}••••••••••••` : '••••••••••••')}
                      </span>
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
                          title={showKey ? 'Ocultar chave' : 'Mostrar chave completa'}
                        >
                          {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyKey(currentKey.key)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center transition ${
                            copiedKey
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#1D4ED8] hover:bg-[#1E40AF] text-white shadow-xs'
                          }`}
                          title="Copiar Chave API"
                        >
                          {copiedKey ? (
                            <>
                              <Check className="w-3.5 h-3.5 mr-1" />
                              <span>Copiada!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 mr-1" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                    Utilize esta chave para conectar seus sistemas e automatizar consultas com segurança.
                  </p>
                </>
              ) : (
                <div className="py-2 space-y-2">
                  <p className="text-xs text-slate-600">
                    Você ainda não gerou sua chave de API para integrações automáticas.
                  </p>
                  <Link
                    to="/api-keys"
                    className="inline-flex items-center text-xs font-bold text-[#1D4ED8] hover:underline"
                  >
                    + Criar minha primeira chave &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <Link to="/api-keys" className="text-xs font-semibold text-[#1D4ED8] hover:underline flex items-center">
              Gerenciar Chaves &rarr;
            </Link>
            <Link to="/docs" className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center">
              Documentação
            </Link>
          </div>
        </div>

        {/* Card 2: Modalidade & Condições Contratuais */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                <ShieldCheck className="w-4 h-4 mr-2 text-amber-600" />
                Contrato & Faturamento
              </h4>
              <span className="text-xs font-bold text-slate-700">
                {isPostPaid ? 'Pós-pago (Faturado)' : 'Pré-pago'}
              </span>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Tarifa por consulta:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  R$ {Number(company?.customQueryPrice || 5).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Emissão de Laudos:</span>
                <span className="font-semibold text-slate-800">Inclusos em PDF e Excel</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">{isPostPaid ? 'Vencimento da fatura:' : 'Recargas:'}</span>
                <span className="font-bold text-slate-900">
                  {isPostPaid ? `Todo dia ${company?.billingDueDate || 10}` : 'Disponíveis via Pix'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed pt-2">
              Todas as consultas geram certidões digitais e relatórios completos para auditoria.
            </p>
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <Link to="/minha-assinatura" className="text-xs font-semibold text-[#1D4ED8] hover:underline flex items-center">
              Ver Minha Assinatura &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
