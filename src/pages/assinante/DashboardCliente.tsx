import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Wallet,
  Building2,
  Clock,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

import DetalhesConsultaModal from '../../components/imobiliario/DetalhesConsultaModal';

export default function DashboardCliente() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const company = user?.company;

  const [documentoRapido, setDocumentoRapido] = useState('');
  const [recentQueries, setRecentQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/api/imobiliario/historico?limit=5');
        if (response.data?.success) {
          setRecentQueries(response.data.data);
        }
      } catch (err) {
        console.error('Erro ao carregar histórico:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (documentoRapido.trim()) {
      navigate(`/consultar?doc=${encodeURIComponent(documentoRapido.trim())}`);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Banner Principal de Consulta */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
        <div className="max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Consulta de Histórico Imobiliário
          </h2>
          <p className="text-slate-600 text-sm mt-2 leading-relaxed">
            Pesquise registros de imóveis, compras, vendas e titularidades vinculadas a qualquer CPF ou CNPJ.
          </p>

          <form onSubmit={handleQuickSearch} className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={documentoRapido}
                onChange={(e) => setDocumentoRapido(e.target.value)}
                placeholder="Informe o CPF ou CNPJ para consulta..."
                className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 font-mono transition shadow-xs"
              />
            </div>
            <button
              type="submit"
              className="bg-[#1D4ED8] hover:bg-[#1E40AF] active:bg-[#172554] text-white font-medium px-6 py-3 rounded-xl text-sm flex items-center justify-center transition shadow-xs"
            >
              Consultar
              <ArrowUpRight className="w-4 h-4 ml-1.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Cards de Métricas e Saldo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Saldo / Modalidade */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Plano de Pagamento</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          {company?.accountType === 'PRE_PAID' ? (
            <div>
              <p className="text-2xl font-bold text-slate-900 font-mono">
                R$ {(company?.creditsBalance || 0).toFixed(2)}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-emerald-700 font-medium">Plano pré-pago</span>
                <Link to="/extrato" className="font-semibold text-[#1D4ED8] hover:underline">
                  Recarregar &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-bold text-slate-900">Pós-pago</p>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-[#1D4ED8]" />
                  Vencimento dia {company?.billingDueDate || 10}
                </span>
                <Link to="/extrato" className="font-semibold text-[#1D4ED8] hover:underline">
                  Ver faturas
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Card Integração API */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Integração de Sistemas</span>
            <FileText className="w-4 h-4 text-[#1D4ED8]" />
          </div>
          <p className="text-2xl font-bold text-slate-900">API Direta</p>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-slate-500">Consultas em tempo real</span>
            <Link to="/docs" className="font-semibold text-[#1D4ED8] hover:underline">
              Guia de Integração &rarr;
            </Link>
          </div>
        </div>

        {/* Card Segurança e Fontes */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Fontes oficiais</span>
            <Building2 className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">Cartórios & DOI</p>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-slate-500">Serventias de imóveis</span>
            <span className="text-emerald-700 font-semibold">Cobertura nacional</span>
          </div>
        </div>
      </div>

      {/* Histórico Recente de Consultas */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
            <Clock className="w-4 h-4 mr-2 text-[#1D4ED8]" />
            Últimas consultas realizadas
          </h3>
          <Link to="/consultar" className="text-xs font-semibold text-[#1D4ED8] hover:underline">
            Nova pesquisa &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Carregando histórico...</div>
        ) : recentQueries.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Nenhuma consulta realizada ainda. Digite um CPF ou CNPJ acima para pesquisar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Documento</th>
                  <th className="py-3 px-4 font-semibold">Canal</th>
                  <th className="py-3 px-4 font-semibold">Declarações</th>
                  <th className="py-3 px-4 font-semibold">Tarifa</th>
                  <th className="py-3 px-4 font-semibold">Data e hora</th>
                  <th className="py-3 px-4 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentQueries.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold font-mono text-slate-900">{q.identifier}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                        {q.source}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {q.totalDeclaracoes} declarações
                    </td>
                    <td className="py-3 px-4 text-emerald-700 font-bold font-mono">
                      R$ {Number(q.cost).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(q.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedQueryId(q.id)}
                        className="text-xs text-[#1D4ED8] hover:text-[#1E40AF] font-semibold cursor-pointer"
                      >
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
