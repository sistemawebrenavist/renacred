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

export default function DashboardCliente() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const company = user?.company;

  const [documentoRapido, setDocumentoRapido] = useState('');
  const [recentQueries, setRecentQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      {/* Banner Principal Institucional */}
      <div className="bg-[#0B1325] border border-[#1E293B] rounded-2xl p-8 shadow-xl">
        <div className="max-w-3xl">
          <div className="flex items-center space-x-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Rede Nacional de Proteção ao Crédito • Base Cartorária & DOI</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Consulta de Histórico Imobiliário Nacional
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
            Consulte a titularidade, histórico de compras, vendas e registros em cartórios de imóveis vinculados a qualquer CPF ou CNPJ em tempo real.
          </p>

          <form onSubmit={handleQuickSearch} className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={documentoRapido}
                onChange={(e) => setDocumentoRapido(e.target.value)}
                placeholder="Informe o CPF ou CNPJ para consulta..."
                className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-mono"
              />
            </div>
            <button
              type="submit"
              className="bg-[#1D4ED8] hover:bg-[#2563EB] text-white font-bold px-6 py-3 rounded-xl text-xs sm:text-sm flex items-center justify-center transition shadow-lg shadow-blue-900/20"
            >
              Consultar Agora
              <ArrowUpRight className="w-4 h-4 ml-1.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Cards de Métricas e Saldo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Saldo / Modalidade */}
        <div className="bg-[#0B1325] border border-[#1E293B] rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Modalidade Comercial</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          {company?.accountType === 'PRE_PAID' ? (
            <div>
              <p className="text-2xl font-extrabold text-white font-mono">
                R$ {(company?.creditsBalance || 0).toFixed(2)}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-emerald-400 font-semibold">Conta Pré-paga</span>
                <Link to="/extrato" className="text-xs font-bold text-blue-400 hover:text-blue-300">
                  + Recarga Pix &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-extrabold text-blue-400">Pós-pago</p>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-blue-400" />
                  Vencimento dia {company?.billingDueDate || 10}
                </span>
                <Link to="/extrato" className="font-bold text-blue-400 hover:underline">
                  Ver Faturas
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Card Integração API */}
        <div className="bg-[#0B1325] border border-[#1E293B] rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Integração de Sistemas</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">API REST v1</p>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-slate-400">JSON • Alta Confiabilidade</span>
            <Link to="/docs" className="text-xs font-bold text-blue-400 hover:underline">
              Documentação &rarr;
            </Link>
          </div>
        </div>

        {/* Card Segurança e Fontes */}
        <div className="bg-[#0B1325] border border-[#1E293B] rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Fontes Oficiais</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">Cartórios & DOI</p>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-slate-400">Receita Federal do Brasil</span>
            <span className="text-emerald-400 font-bold">Cobertura Nacional</span>
          </div>
        </div>
      </div>

      {/* Histórico Recente de Consultas */}
      <div className="bg-[#0B1325] border border-[#1E293B] rounded-xl p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <Clock className="w-4 h-4 mr-2 text-blue-400" />
            Últimas Consultas Realizadas
          </h3>
          <Link to="/consultar" className="text-xs font-bold text-blue-400 hover:underline">
            Nova Pesquisa &rarr;
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
              <thead className="text-slate-400 uppercase tracking-wider border-b border-[#1E293B]">
                <tr>
                  <th className="py-3 px-4">Documento</th>
                  <th className="py-3 px-4">Canal</th>
                  <th className="py-3 px-4">Declarações</th>
                  <th className="py-3 px-4">Tarifa</th>
                  <th className="py-3 px-4">Data/Hora</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60">
                {recentQueries.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-bold font-mono text-slate-200">{q.identifier}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0F172A] border border-[#1E293B] text-slate-300">
                        {q.source}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {q.totalDeclaracoes} declarações
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-bold font-mono">
                      R$ {Number(q.cost).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(q.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/consultar?doc=${q.identifier}`}
                        className="text-xs text-blue-400 hover:text-blue-300 font-bold"
                      >
                        Visualizar
                      </Link>
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
