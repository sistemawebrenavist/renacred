import React, { useState, useEffect } from 'react';
import { Activity, Clock, ShieldCheck, Filter } from 'lucide-react';
import api from '../../services/api';

export default function LogsApi() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/api/admin/logs?limit=50');
        if (res.data?.success) setLogs(res.data.data);
      } catch (err) {
        console.error('Erro ao buscar logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
          <Activity className="w-6 h-6 mr-2.5 text-blue-600" />
          Logs de Requisições da API Externa
        </h2>
        <p className="text-slate-500 text-xs mt-1">
          Monitoramento em tempo real de latência, códigos HTTP e consumo por chave de API.
        </p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Carregando logs da API...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">Nenhum log registrado ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/50">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Endpoint</th>
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4">Latência</th>
                  <th className="py-3 px-4">Tarifa</th>
                  <th className="py-3 px-4">IP Origem</th>
                  <th className="py-3 px-4 text-right">Data/Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.statusCode === 200
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {l.statusCode}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-sans font-semibold">
                      {l.method} {l.endpoint}
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-sans">
                      {l.apiKey?.company?.razaoSocial || 'Desconhecida'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{l.responseTimeMs}ms</td>
                    <td className="py-3 px-4 text-emerald-700 font-bold">R$ {Number(l.creditsUsed).toFixed(2)}</td>
                    <td className="py-3 px-4 text-slate-600">{l.ipAddress || '-'}</td>
                    <td className="py-3 px-4 text-right text-slate-500 font-sans">
                      {new Date(l.createdAt).toLocaleString('pt-BR')}
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
