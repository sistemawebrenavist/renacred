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
        toast.success('Consulta realizada com sucesso!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao realizar consulta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="bg-white border border-amber-200 rounded-3xl p-8 shadow-xs">
        <div className="flex items-center space-x-2 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>Consulta de Teste Interno</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Consulta Avulsa
        </h2>
        <p className="text-slate-500 text-xs mt-1">
          Realize consultas para conferência e validação cadastral sem débito de saldo.
        </p>

        <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-2xl">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="Digite o CPF ou CNPJ..."
              className="w-full bg-white border border-slate-300 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/20 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold px-6 py-3.5 rounded-2xl text-sm flex items-center justify-center transition shadow-xs disabled:opacity-50"
          >
            {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : 'Consultar'}
          </button>
        </form>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Resultado da Consulta</span>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-xl font-bold text-slate-900 font-mono">{documento}</span>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
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
