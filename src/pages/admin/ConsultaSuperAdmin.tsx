import React, { useState } from 'react';
import { Search, ShieldAlert, CheckCircle2, AlertCircle, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import { DeclaracaoCard, DeclaracaoProps } from '../../components/imobiliario/DeclaracaoCard';
import { ExportPdfButton } from '../../components/imobiliario/ExportPdfButton';
import { ExportExcelButton } from '../../components/imobiliario/ExportExcelButton';

export default function ConsultaSuperAdmin() {
  const [documento, setDocumento] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    periodo?: string;
    total_declaracoes: number;
    declaracoes: DeclaracaoProps[];
  } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documento.trim()) {
      toast.error('Informe um CPF ou CNPJ.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/admin/consulta-superadmin', { documento });
      if (res.data?.success) {
        setResult(res.data.data);
        toast.success(`Consulta SuperAdmin executada com sucesso! (${res.data.tempoProcessamentoMs}ms)`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao realizar consulta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="bg-[#0b1325] border border-amber-500/30 rounded-3xl p-8 shadow-xl">
        <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
          <ShieldAlert className="w-4 h-4" />
          <span>Ambiente de Testes Master (Sem Cobrança)</span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Consulta Direta Super Admin
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          Execute testes e auditorias livres de consumo diretamente na fonte da FetchBrasil.
        </p>

        <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-2xl">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="Digite o CPF ou CNPJ para teste..."
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-6 py-3.5 rounded-2xl text-sm flex items-center justify-center transition shadow-lg shadow-amber-600/20 disabled:opacity-50"
          >
            {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : 'Auditar CPF/CNPJ'}
          </button>
        </form>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="bg-[#0b1325] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Resultado SuperAdmin</span>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-xl font-bold text-white font-mono">{documento}</span>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {result.total_declaracoes} declarações
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <ExportExcelButton documento={documento} declaracoes={result.declaracoes} />
              <ExportPdfButton
                documento={documento}
                totalDeclaracoes={result.total_declaracoes}
                periodo={result.periodo}
                declaracoes={result.declaracoes}
              />
            </div>
          </div>

          <div className="space-y-4">
            {result.declaracoes.map((dec, idx) => (
              <DeclaracaoCard key={idx} declaracao={dec} index={idx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
