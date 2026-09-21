import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  Search, 
  DollarSign, 
  TrendingUp, 
  ShieldAlert, 
  Clock, 
  Activity 
} from 'lucide-react';
import api from '../../services/api';

export default function DashboardAdmin() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Painel Geral da Administração
        </h2>
        <p className="text-slate-500 text-xs mt-1">
          Acompanhamento consolidado de clientes cadastrados, volume de consultas e faturamento da plataforma.
        </p>
      </div>

      {/* Cards de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
            <span>Empresas Cadastradas</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 font-mono">{loading ? '...' : metrics?.totalCompanies || 0}</p>
          <span className="text-xs text-blue-700 mt-2 block font-medium">
            {metrics?.activeCompanies || 0} contas ativas
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
            <span>Consultas Hoje</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 font-mono">{loading ? '...' : metrics?.queriesToday || 0}</p>
          <span className="text-xs text-slate-500 mt-2 block">Tempo real</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
            <span>Consultas no Mês</span>
            <Activity className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 font-mono">{loading ? '...' : metrics?.queriesMonth || 0}</p>
          <span className="text-xs text-slate-500 mt-2 block">Volume acumulado</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
            <span>Faturamento Bruto</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-emerald-700 font-mono">
            R$ {loading ? '...' : (metrics?.totalRevenue || 0).toFixed(2)}
          </p>
          <span className="text-xs text-slate-500 mt-2 block">Receita de consultas</span>
        </div>
      </div>

      {/* Consultas Recentes na Plataforma */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center">
          <Search className="w-4 h-4 mr-2 text-blue-600" />
          Últimas Consultas de Todos os Clientes
        </h3>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Carregando dados...</div>
        ) : !metrics?.recentQueries || metrics.recentQueries.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">Nenhuma consulta realizada ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/50">
                <tr>
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4">Modalidade</th>
                  <th className="py-3 px-4">Documento</th>
                  <th className="py-3 px-4">Canal</th>
                  <th className="py-3 px-4">Tarifa</th>
                  <th className="py-3 px-4 text-right">Data/Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.recentQueries.map((q: any) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">{q.company?.razaoSocial}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {q.company?.accountType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{q.identifier}</td>
                    <td className="py-3 px-4 text-slate-500">{q.source}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700 font-mono">R$ {Number(q.cost).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {new Date(q.createdAt).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
