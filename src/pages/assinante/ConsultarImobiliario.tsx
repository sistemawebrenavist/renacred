import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Building, AlertCircle, CheckCircle2, RotateCw, Layers } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { DeclaracaoCard, DeclaracaoProps } from '../../components/imobiliario/DeclaracaoCard';
import { ExportPdfButton } from '../../components/imobiliario/ExportPdfButton';
import { ExportExcelButton } from '../../components/imobiliario/ExportExcelButton';

export default function ConsultarImobiliario() {
  const [searchParams] = useSearchParams();
  const { refreshProfile } = useAuth();

  const [documento, setDocumento] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    periodo?: string;
    total_declaracoes: number;
    declaracoes: DeclaracaoProps[];
  } | null>(null);

  // Se vier parâmetro na URL (?doc=...), busca automaticamente
  useEffect(() => {
    const docParam = searchParams.get('doc');
    if (docParam && docParam !== documento && !loading && !result) {
      setDocumento(docParam);
      handleSearch(docParam);
    }
  }, [searchParams]);

  const handleSearch = async (docToSearch?: string) => {
    const target = docToSearch || documento;
    if (!target.trim()) {
      toast.error('Informe um CPF ou CNPJ válido.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/imobiliario/consultar', { documento: target });
      if (response.data?.success) {
        setResult(response.data.data);
        toast.success(`Consulta realizada! ${response.data.data.total_declaracoes} declarações encontradas.`);
        // Atualiza o saldo no cabeçalho
        refreshProfile();
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Erro ao realizar consulta.';
      toast.error(msg);
      if (error.response?.status === 402) {
        toast.error('Saldo insuficiente. Realize uma recarga na aba Extrato.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Bloco de Busca */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <Building className="w-6 h-6 mr-2.5 text-blue-600" />
            Consulta de Imóveis
          </h2>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
            Informe o CPF ou CNPJ para pesquisar o histórico de transações e registros de imóveis vinculados.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="mt-6 flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                className="w-full bg-white border border-slate-300 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 transition font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-8 py-3.5 rounded-2xl text-sm flex items-center justify-center transition shadow-xs disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                  Consultando...
                </>
              ) : (
                'Consultar'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Exibição dos Resultados */}
      {loading ? (
        <div key="state-loading" className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-900"><span>Consultando bases cartorárias e registros...</span></p>
          <p className="text-xs text-slate-500"><span>Varrendo serventias de registros de imóveis e declarações imobiliárias em tempo real.</span></p>
        </div>
      ) : result ? (
        <div key="state-result" className="space-y-6">
          {/* Barra de Ações & Resumo */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Resultado da Pesquisa</span>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-xl font-bold text-slate-900 font-mono">{documento}</span>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  {result.total_declaracoes} declarações encontradas
                </span>
                {result.periodo && (
                  <span className="text-xs text-slate-500 font-medium">
                    Período: {result.periodo}
                  </span>
                )}
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

          {/* Lista de Declarações */}
          {result.declaracoes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-xs">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-900">Nenhum registro de imóvel localizado</p>
              <p className="text-xs text-slate-500 mt-1">
                Não foram identificadas transações imobiliárias ativas ou históricas (DOI) para o documento informado.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                <Layers className="w-4 h-4 mr-1.5 text-blue-600" />
                Histórico de Operações e Matrículas Cartorárias
              </div>
              {result.declaracoes.map((dec, idx) => (
                <DeclaracaoCard key={idx} declaracao={dec} index={idx} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
