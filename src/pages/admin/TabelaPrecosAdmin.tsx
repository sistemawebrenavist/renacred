import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import api from '../../services/api';
import ConfirmModal from '../../components/ui/ConfirmModal';

interface ProductPricingRow {
  code: string;
  slug: string;
  name: string;
  category: string;
  inputType: string;
  originalCost: number;
  originalPrice: number;
  currentCost: number;
  currentPrice: number;
  isActive: boolean;
  margin: number;
  marginPercent: number;
  isModified: boolean;
}

interface PricingSummary {
  total: number;
  ativos: number;
  ticketMedio: number;
  custoMedio: number;
  margemMediaPercent: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  todos: 'Todos os Produtos',
  veicular: 'Veicular',
  cadastral: 'Cadastral',
  juridico: 'Jurídico',
  imobiliario: 'Imobiliário'
};

export default function TabelaPrecosAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<ProductPricingRow[]>([]);
  const [summary, setSummary] = useState<PricingSummary>({
    total: 0,
    ativos: 0,
    ticketMedio: 0,
    custoMedio: 0,
    margemMediaPercent: 0
  });

  // Alterações em edição local: { [code]: { price?: number, cost?: number, isActive?: boolean } }
  const [draftEdits, setDraftEdits] = useState<
    Record<string, { price?: number; cost?: number; isActive?: boolean }>
  >({});

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [onlyModified, setOnlyModified] = useState(false);

  // Modal de confirmação para restaurar padrões
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const fetchPricingTable = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/produtos/tabela-precos');
      if (res.data?.success) {
        setProducts(res.data.produtos || []);
        if (res.data.resumo) {
          setSummary(res.data.resumo);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Falha ao carregar a tabela de preços.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricingTable();
  }, []);

  // Manipuladores de edição de valores
  const handlePriceChange = (code: string, rawVal: string) => {
    const parsed = rawVal === '' ? undefined : parseFloat(rawVal);
    setDraftEdits((prev) => ({
      ...prev,
      [code]: {
        ...prev[code],
        price: parsed !== undefined && !isNaN(parsed) && parsed >= 0 ? parsed : undefined
      }
    }));
  };

  const handleCostChange = (code: string, rawVal: string) => {
    const parsed = rawVal === '' ? undefined : parseFloat(rawVal);
    setDraftEdits((prev) => ({
      ...prev,
      [code]: {
        ...prev[code],
        cost: parsed !== undefined && !isNaN(parsed) && parsed >= 0 ? parsed : undefined
      }
    }));
  };

  const handleToggleActive = (code: string, currentVal: boolean) => {
    const nextVal = !currentVal;
    setDraftEdits((prev) => ({
      ...prev,
      [code]: {
        ...prev[code],
        isActive: nextVal
      }
    }));
  };

  // Restaura linha única localmente
  const handleDiscardRow = (code: string) => {
    setDraftEdits((prev) => {
      const copy = { ...prev };
      delete copy[code];
      return copy;
    });
  };

  // Contagem de itens modificados no rascunho
  const modifiedCount = useMemo(() => {
    let count = 0;
    for (const p of products) {
      const draft = draftEdits[p.code];
      if (!draft) continue;
      const isPriceChanged = draft.price !== undefined && Math.abs(draft.price - p.currentPrice) > 0.001;
      const isCostChanged = draft.cost !== undefined && Math.abs(draft.cost - p.currentCost) > 0.001;
      const isActiveChanged = draft.isActive !== undefined && draft.isActive !== p.isActive;
      if (isPriceChanged || isCostChanged || isActiveChanged) {
        count++;
      }
    }
    return count;
  }, [products, draftEdits]);

  // Salvar alterações em lote
  const handleSaveAll = async () => {
    if (modifiedCount === 0) return;

    setSaving(true);
    try {
      const itemsToUpdate: Array<{
        code: string;
        cost?: number;
        price?: number;
        isActive?: boolean;
      }> = [];

      for (const p of products) {
        const draft = draftEdits[p.code];
        if (!draft) continue;

        const effectiveCost = draft.cost !== undefined ? draft.cost : p.currentCost;
        const effectivePrice = draft.price !== undefined ? draft.price : p.currentPrice;
        const effectiveActive = draft.isActive !== undefined ? draft.isActive : p.isActive;

        itemsToUpdate.push({
          code: p.code,
          cost: effectiveCost,
          price: effectivePrice,
          isActive: effectiveActive
        });
      }

      const res = await api.put('/api/admin/produtos/tabela-precos', { items: itemsToUpdate });
      if (res.data?.success) {
        toast.success(res.data.message || 'Tabela de preços atualizada com sucesso!');
        setProducts(res.data.produtos || []);
        if (res.data.resumo) {
          setSummary(res.data.resumo);
        }
        setDraftEdits({});
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar alterações da tabela de preços.');
    } finally {
      setSaving(false);
    }
  };

  // Descartar todas as alterações do rascunho
  const handleDiscardAll = () => {
    setDraftEdits({});
    toast.info('Alterações não salvas foram descartadas.');
  };

  // Restauração aos padrões de fábrica
  const handleConfirmReset = async () => {
    setResetLoading(true);
    try {
      const res = await api.post('/api/admin/produtos/tabela-precos/reset');
      if (res.data?.success) {
        toast.success('Padrões de fábrica restaurados com sucesso!');
        setProducts(res.data.produtos || []);
        if (res.data.resumo) {
          setSummary(res.data.resumo);
        }
        setDraftEdits({});
        setIsResetModalOpen(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao restaurar padrões.');
    } finally {
      setResetLoading(false);
    }
  };

  // Categorias disponíveis e suas contagens
  const categoriesCounts = useMemo(() => {
    const counts: Record<string, number> = { todos: products.length };
    for (const p of products) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return counts;
  }, [products]);

  // Produtos filtrados para exibição
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const draft = draftEdits[p.code];
      const isDraftModified = draft && (
        (draft.price !== undefined && Math.abs(draft.price - p.currentPrice) > 0.001) ||
        (draft.cost !== undefined && Math.abs(draft.cost - p.currentCost) > 0.001) ||
        (draft.isActive !== undefined && draft.isActive !== p.isActive)
      );
      const isAnyModified = p.isModified || isDraftModified;

      if (onlyModified && !isAnyModified) return false;
      if (selectedCategory !== 'todos' && p.category !== selectedCategory) return false;

      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;

      return (
        p.code.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term) ||
        p.slug.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.inputType.toLowerCase().includes(term)
      );
    });
  }, [products, draftEdits, selectedCategory, searchTerm, onlyModified]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Cabeçalho Executivo */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Administração Global
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">
                Tabela Oficial da Plataforma
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Tabela de Preços & Custos de Consulta
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Definição centralizada dos preços padrão cobrados dos assinantes, custos unitários dos provedores de dados e margem operacional por produto.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              disabled={loading || saving}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              Restaurar Padrões de Fábrica
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={modifiedCount === 0 || saving}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition shadow-xs cursor-pointer ${
                modifiedCount > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              {saving ? 'Salvando...' : modifiedCount > 0 ? `Salvar Alterações (${modifiedCount})` : 'Salvar Alterações'}
            </button>
          </div>
        </div>

        {/* Barra de Indicadores Financeiros */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Produtos Ativos
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-bold font-mono text-slate-900">
                {summary.ativos}
              </span>
              <span className="text-[11px] text-slate-500 font-sans">
                de {summary.total} cadastrados
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Ticket Médio de Venda
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-slate-400 font-mono text-xs">R$</span>
              <span className="text-lg font-bold font-mono text-slate-900">
                {summary.ticketMedio.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-[10px] text-slate-500 font-sans ml-1">/consulta</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Custo Médio API
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-slate-400 font-mono text-xs">R$</span>
              <span className="text-lg font-bold font-mono text-slate-700">
                {summary.custoMedio.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-[10px] text-slate-500 font-sans ml-1">/consulta</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Margem Média Bruta
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-bold font-mono text-emerald-700">
                +{summary.margemMediaPercent.toFixed(1).replace('.', ',')}%
              </span>
              <span className="text-[10px] text-emerald-800 font-medium">
                (R$ {(summary.ticketMedio - summary.custoMedio).toFixed(2).replace('.', ',')})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Abas de Categorias */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {(['todos', 'veicular', 'cadastral', 'juridico', 'imobiliario'] as const).map((cat) => {
            const isSelected = selectedCategory === cat;
            const count = categoriesCounts[cat] || 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                }`}
              >
                {CATEGORY_LABELS[cat] || cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Busca e Filtro de Modificados */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg shrink-0">
            <input
              type="checkbox"
              checked={onlyModified}
              onChange={(e) => setOnlyModified(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
            />
            <span>Somente Modificados</span>
          </label>

          <input
            type="text"
            placeholder="Filtrar por código ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
          />
        </div>
      </div>

      {/* Matriz de Produtos e Preços (Tabela de Alta Densidade) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-3 w-16 text-center">Status</th>
                <th className="py-3 px-3 w-20 text-center">Código</th>
                <th className="py-3 px-4">Produto & Parâmetro de Busca</th>
                <th className="py-3 px-3 w-28 text-center">Categoria</th>
                <th className="py-3 px-4 w-36 text-right">Custo API (R$)</th>
                <th className="py-3 px-4 w-44 text-right">Preço de Venda (R$)</th>
                <th className="py-3 px-4 w-36 text-right">Margem Est.</th>
                <th className="py-3 px-3 w-24 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Carregando matriz de produtos e precificação...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhum produto localizado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const draft = draftEdits[p.code];
                  const effectiveCost = draft?.cost !== undefined ? draft.cost : p.currentCost;
                  const effectivePrice = draft?.price !== undefined ? draft.price : p.currentPrice;
                  const effectiveActive = draft?.isActive !== undefined ? draft.isActive : p.isActive;

                  const marginVal = effectivePrice - effectiveCost;
                  const marginPct = effectiveCost > 0 ? (marginVal / effectiveCost) * 100 : 100;

                  const isRowDrafted = draft !== undefined && (
                    (draft.price !== undefined && Math.abs(draft.price - p.currentPrice) > 0.001) ||
                    (draft.cost !== undefined && Math.abs(draft.cost - p.currentCost) > 0.001) ||
                    (draft.isActive !== undefined && draft.isActive !== p.isActive)
                  );

                  const isDiffFromFactory =
                    Math.abs(effectiveCost - p.originalCost) > 0.001 ||
                    Math.abs(effectivePrice - p.originalPrice) > 0.001 ||
                    !effectiveActive;

                  return (
                    <tr
                      key={p.code}
                      className={`transition-colors ${
                        !effectiveActive
                          ? 'bg-slate-50/70 opacity-60'
                          : isRowDrafted
                          ? 'bg-blue-50/30'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Status / Toggle Ativo */}
                      <td className="py-3 px-3 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={effectiveActive}
                          onChange={() => handleToggleActive(p.code, effectiveActive)}
                          title={effectiveActive ? 'Produto ativo para consultas' : 'Produto desativado na plataforma'}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                      </td>

                      {/* Código */}
                      <td className="py-3 px-3 text-center align-middle font-mono">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold border bg-slate-100 text-slate-800 border-slate-200">
                          {p.code}
                        </span>
                      </td>

                      {/* Produto & Parâmetro de Busca */}
                      <td className="py-3 px-4 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {p.name}
                          </span>
                          {isRowDrafted && (
                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-blue-100 text-blue-800">
                              Editado
                            </span>
                          )}
                          {!isRowDrafted && isDiffFromFactory && (
                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                              Customizado
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-sans">
                          <span>Entrada: <strong className="font-semibold text-slate-600 uppercase">{p.inputType}</strong></span>
                          <span>•</span>
                          <span className="text-slate-400 font-mono">slug: {p.slug}</span>
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="py-3 px-3 text-center align-middle">
                        <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {CATEGORY_LABELS[p.category] || p.category}
                        </span>
                      </td>

                      {/* Custo API (Fixo) */}
                      <td className="py-3 px-4 text-right align-middle font-mono">
                        <div className="flex items-center justify-end space-x-1">
                          <span className="text-slate-400 text-[11px]">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={draft?.cost !== undefined ? draft.cost : p.currentCost}
                            onChange={(e) => handleCostChange(p.code, e.target.value)}
                            title="Custo unitário da API do provedor para esta consulta"
                            className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-right font-mono text-xs font-bold text-slate-700 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
                          />
                        </div>
                        {Math.abs(effectiveCost - p.originalCost) > 0.001 && (
                          <span className="text-[9.5px] text-slate-400 block mt-0.5">
                            Padrão: R$ {p.originalCost.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </td>

                      {/* Preço de Venda ao Cliente */}
                      <td className="py-3 px-4 text-right align-middle font-mono">
                        <div className="flex items-center justify-end space-x-1">
                          <span className="text-slate-400 text-[11px]">R$</span>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            value={draft?.price !== undefined ? draft.price : p.currentPrice}
                            onChange={(e) => handlePriceChange(p.code, e.target.value)}
                            title="Preço unitário padrão cobrado do assinante por consulta com dados"
                            className={`w-24 bg-white border rounded px-2 py-1 text-right font-mono text-xs font-bold text-slate-900 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 ${
                              isRowDrafted ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-200'
                            }`}
                          />
                        </div>
                        {Math.abs(effectivePrice - p.originalPrice) > 0.001 && (
                          <span className="text-[9.5px] text-slate-400 block mt-0.5">
                            Padrão: R$ {p.originalPrice.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </td>

                      {/* Margem Unitária Estimada */}
                      <td className="py-3 px-4 text-right align-middle font-mono">
                        <span
                          className={`font-bold block ${
                            marginVal >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {marginVal >= 0 ? '+' : ''}R$ {marginVal.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {marginVal >= 0 ? '+' : ''}{marginPct.toFixed(1).replace('.', ',')}%
                        </span>
                      </td>

                      {/* Ações por Linha */}
                      <td className="py-3 px-3 text-center align-middle">
                        {isRowDrafted ? (
                          <button
                            type="button"
                            onClick={() => handleDiscardRow(p.code)}
                            className="px-2 py-1 text-[10.5px] font-semibold text-rose-700 hover:bg-rose-50 rounded border border-rose-200 transition cursor-pointer"
                          >
                            Descartar
                          </button>
                        ) : isDiffFromFactory ? (
                          <button
                            type="button"
                            onClick={() => {
                              handleCostChange(p.code, String(p.originalCost));
                              handlePriceChange(p.code, String(p.originalPrice));
                              if (!p.isActive) handleToggleActive(p.code, false);
                            }}
                            className="px-2 py-1 text-[10.5px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded border border-slate-200 transition cursor-pointer"
                            title="Restaurar valores de fábrica deste produto"
                          >
                            Resetar
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-300 font-mono">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barra Flutuante de Salvamento (quando há alterações pendentes) */}
      {modifiedCount > 0 && (
        <div className="fixed bottom-6 inset-x-0 max-w-4xl mx-auto px-4 z-40 animate-in fade-in slide-in-from-bottom-4 duration-150">
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-slate-800">
            <div>
              <p className="text-xs font-bold text-white">
                {modifiedCount} {modifiedCount === 1 ? 'produto com alteração pendente' : 'produtos com alterações pendentes'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Clique em Salvar para aplicar as tarifas e custos imediatamente em toda a plataforma.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDiscardAll}
                disabled={saving}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer disabled:opacity-50"
              >
                Descartar Todas
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className="px-4 py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Gravando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Reset Geral */}
      <ConfirmModal
        isOpen={isResetModalOpen}
        title="Restaurar Padrões de Fábrica"
        description={
          <div>
            <p>
              Você tem certeza de que deseja restaurar <strong>todos os 20 produtos</strong> para as tarifas e custos de fábrica definidos originalmente no catálogo da plataforma?
            </p>
            <p className="mt-2 text-rose-700 font-medium">
              Todas as personalizações globais de custos e preços atuais serão redefinidas imediatamente.
            </p>
          </div>
        }
        confirmText="Restaurar Tudo"
        cancelText="Voltar"
        variant="danger"
        loading={resetLoading}
        onConfirm={handleConfirmReset}
        onClose={() => setIsResetModalOpen(false)}
      />
    </div>
  );
}
