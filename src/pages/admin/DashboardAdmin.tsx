import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  DollarSign, 
  Clock, 
  Activity,
  Eye,
  CheckCircle2,
  Building2,
  KeyRound,
  FileText
} from 'lucide-react';
import api from '../../services/api';
import DetalhesConsultaModal from '../../components/imobiliario/DetalhesConsultaModal';

export default function DashboardAdmin() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await api.get('/api/admin/metrics');
        if (res.data?.success) setMetrics(res.data.data);
      } catch (err) {
        console.error('Erro ao buscar métricas admin:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

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
      {/* Cabeçalho */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Visão Geral da Plataforma
        </h2>
        <p className="text-slate-500 text-xs mt-1">
          Acompanhamento em tempo real de clientes, faturamento e consultas efetuadas via API.
        </p>
      </div>

      {/* Cards de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
            <span>Clientes Cadastrados</span>
            <Users className="w-4 h-4 text-[#1D4ED8]" />
          </div>
          <p className="text-3xl font-bold text-slate-900 font-mono">{loading ? '...' : metrics?.totalCompanies || 0}</p>
          <span className="text-xs text-[#1D4ED8] mt-2 block font-medium">
            {metrics?.activeCompanies || 0} contas ativas
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
            <span>Consultas API Hoje</span>
            <Clock className="w-4 h-4 text-[#1D4ED8]" />
          </div>
          <p className="text-3xl font-bold text-slate-900 font-mono">{loading ? '...' : metrics?.queriesToday || 0}</p>
          <span className="text-xs text-slate-500 mt-2 block">Consultas via integração hoje</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
            <span>Consultas API no Mês</span>
            <Activity className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 font-mono">{loading ? '...' : metrics?.queriesMonth || 0}</p>
          <span className="text-xs text-slate-500 mt-2 block">Volume acumulado no mês</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
            <span>Faturamento no Mês</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-emerald-700 font-mono">
            R$ {loading ? '...' : Number(metrics?.totalRevenue || 0).toFixed(2)}
          </p>
          <span className="text-xs text-slate-500 mt-2 block">Receita de consultas</span>
        </div>
      </div>

      {/* Consultas da API do Cliente (Em Tempo Real) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center">
              <KeyRound className="w-4 h-4 mr-2 text-[#1D4ED8]" />
              Consultas da API do Cliente (Em Tempo Real)
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Consultas efetuadas através das chaves de API dos clientes assinantes.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Carregando consultas...</div>
        ) : !metrics?.recentQueries || metrics.recentQueries.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Nenhuma consulta via API de cliente registrada recentemente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/50">
                <tr>
                  <th className="py-3 px-4">Empresa (Cliente)</th>
                  <th className="py-3 px-4">Plano</th>
                  <th className="py-3 px-4">Documento Consultado</th>
                  <th className="py-3 px-4 text-center">Declarações</th>
                  <th className="py-3 px-4">Tarifa</th>
                  <th className="py-3 px-4 text-right">Data/Hora</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.recentQueries.map((q: any) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{q.company?.razaoSocial}</div>
                      {q.company?.cnpjCpf && (
                        <div className="text-[11px] text-slate-400 font-mono">{formatDoc(q.company.cnpjCpf)}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {q.company?.accountType === 'PRE_PAID' ? 'Pré-pago' : 'Pós-pago'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {formatDoc(q.identifier)}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                      {q.status === 'ERROR' ? (
                        <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Falha
                        </span>
                      ) : (
                        q.totalDeclaracoes || 0
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700 font-mono">
                      R$ {Number(q.cost || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 font-sans">
                      {new Date(q.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedQueryId(q.id)}
                        title="Visualizar declarações"
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-[#1D4ED8] bg-blue-50 hover:bg-blue-100/80 rounded-lg transition"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Visualizar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes da Consulta */}
      <DetalhesConsultaModal
        isOpen={!!selectedQueryId}
        queryId={selectedQueryId}
        onClose={() => setSelectedQueryId(null)}
      />
    </div>
  );
}
