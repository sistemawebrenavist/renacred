import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PRODUCTS_CATALOG, ProductDefinition } from '../../config/productsCatalog';

interface SeletorProdutoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: ProductDefinition) => void;
  currentCode: string;
}

export const SeletorProdutoModal: React.FC<SeletorProdutoModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentCode
}) => {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return PRODUCTS_CATALOG;
    return PRODUCTS_CATALOG.filter(
      (p) =>
        p.code.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term) ||
        p.shortName.toLowerCase().includes(term) ||
        p.categoryLabel.toLowerCase().includes(term) ||
        p.inputLabel.toLowerCase().includes(term)
    );
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header do Seletor */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Selecione o Produto de Consulta</h2>
            <p className="text-xs text-slate-500 mt-0.5">Escolha entre as 16 bases oficiais integradas da Renacred</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
          >
            ✕
          </button>
        </div>

        {/* Input de Busca */}
        <div className="p-3 border-b border-slate-100 bg-slate-50">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Digite o código (E1..E16), nome do produto ou categoria..."
            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 transition"
          />
        </div>

        {/* Lista de Produtos */}
        <div className="overflow-y-auto p-3 space-y-1.5 flex-1 divide-y divide-slate-100">
          {filtered.map((p) => {
            const isSelected = p.code.toUpperCase() === currentCode.toUpperCase();
            return (
              <button
                key={p.code}
                onClick={() => {
                  onSelect(p);
                  onClose();
                }}
                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition ${
                  isSelected
                    ? 'bg-blue-50/80 border border-blue-200/80 text-blue-950'
                    : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0 pr-3">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono border shrink-0 ${p.badgeColor.bg} ${p.badgeColor.text} ${p.badgeColor.border}`}>
                    {p.code}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate text-slate-900">{p.name}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{p.description}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    {p.inputLabel}
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-900">
                    R$ {p.defaultPrice.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              Nenhum produto oficial encontrado com o termo &quot;{search}&quot;.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <span>{PRODUCTS_CATALOG.length} produtos oficiais disponíveis</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-xs font-medium text-slate-700 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
