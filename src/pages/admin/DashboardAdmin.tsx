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
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center">
            <ShieldAlert className="w-4 h-4 mr-1.5" />
            Visão Executiva da Plataforma
          </span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight mt-1">
            Painel Geral da Administração
          </h2>
        </div>
      </div>

      {/* Cards de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#0b1325] border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
            <span>Empresas Cadastradas</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-white font-mono">{loading ? '...' : metrics?.totalCompanies || 0}</p>
          <span className="text-xs text-blue-400 mt-2 block font-medium">
            {metrics?.activeCompanies || 0} contas ativas
          </span>
        </div>

        <div className="bg-[#0b1325] border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
            <span>Consultas Hoje</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white font-mono">{loading ? '...' : metrics?.queriesToday || 0}</p>
          <span className="text-xs text-slate-400 mt-2 block">Tempo real</span>
        </div>

        <div className="bg-[#0b1325] border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
            <span>Consultas no Mês</span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-white font-mono">{loading ? '...' : metrics?.queriesMonth || 0}</p>
          <span className="text-xs text-slate-400 mt-2 block">Volume acumulado</span>
        </div>

        <div className="bg-[#0b1325] border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
            <span>Faturamento Bruto</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-emerald-400 font-mono">
            R$ {loading ? '...' : (metrics?.totalRevenue || 0).toFixed(2)}
          </p>
          <span className="text-xs text-slate-400 mt-2 block">Receita de consultas</span>
        </div>
      </div>

      {/* Consultas Recentes na Plataforma */}
      <div className="bg-[#0b1325] border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white mb-4 flex items-center">
          <Search className="w-4 h-4 mr-2 text-blue-500" />
          Últimas Consultas de Todos os Clientes
        </h3>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Carregando dados...</div>
        ) : !metrics?.recentQueries || metrics.recentQueries.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">Nenhuma consulta realizada ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4">Modalidade</th>
                  <th className="py-3 px-4">Documento</th>
                  <th className="py-3 px-4">Canal</th>
                  <th className="py-3 px-4">Tarifa</th>
                  <th className="py-3 px-4 text-right">Data/Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {metrics.recentQueries.map((q: any) => (
                  <tr key={q.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-semibold text-white">{q.company?.razaoSocial}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {q.company?.accountType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-300">{q.identifier}</td>
                    <td className="py-3 px-4 text-slate-400">{q.source}</td>
                    <td className="py-3 px-4 font-bold text-emerald-400">R$ {Number(q.cost).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-slate-400">
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
