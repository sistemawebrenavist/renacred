import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { PRODUCTS_CATALOG, CATEGORIES_CONFIG } from '../../config/productsCatalog';

export default function CatalogoProdutos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  const filteredProducts = useMemo(() => {
    return PRODUCTS_CATALOG.filter((p) => {
      const matchesCategory = selectedCategory === 'todos' || p.category === selectedCategory;
      const term = searchTerm.trim().toLowerCase();
      if (!term) return matchesCategory;

      const matchesSearch =
        p.code.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term) ||
        p.shortName.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.highlights.some((h) => h.toLowerCase().includes(term));

      return matchesCategory && matchesSearch;
    });
  }, [searchTerm, selectedCategory]);

  const handleConsultar = (code: string) => {
    navigate(`/consultar?produto=${code.toLowerCase()}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho Institucional Limpo e Integrado */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Catálogo de Produtos & Serviços de API
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Portfólio com 16 bases oficiais integradas em tempo real para inteligência patrimonial, cadastral e veicular. Cobrança sob demanda individualizada com garantia de custo zero para consultas sem registros.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              16 Bases Oficiais
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Custo Zero sem Dados
            </span>
          </div>
        </div>

        {/* Filtros e Busca Rápida */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Categorias */}
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES_CONFIG.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`ml-1.5 text-[10px] font-mono ${active ? 'text-slate-300' : 'text-slate-400'}`}>
                    ({cat.count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Campo de Busca Textual */}
          <div className="w-full md:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por código, placa, documento..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 focus:bg-white transition"
            />
          </div>
        </div>
      </div>

      {/* Grid de Cards dos Produtos (Padrão Impeccable + InfoSinistros) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((p) => {
          const allowedProducts: string[] = user?.company?.allowedProducts || ['ALL'];
          const isContracted = !!user?.isSuperAdmin || allowedProducts.includes('ALL') || allowedProducts.includes(p.code);
          const customPrices = (user?.company?.customPrices as Record<string, number>) || {};
          const effectivePrice = typeof customPrices[p.code] === 'number'
            ? customPrices[p.code]
            : (user?.company?.customQueryPrice ? Number(user.company.customQueryPrice) : p.defaultPrice);

          return (
            <div
              key={p.code}
              className={`bg-white border rounded-xl p-5 flex flex-col justify-between transition ${
                isContracted
                  ? 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  : 'border-slate-200/80 bg-slate-50/50 opacity-80'
              }`}
            >
              <div>
                {/* Topo do Card: Código + Categoria à esquerda | Preço da API em destaque à direita */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${p.badgeColor.bg} ${p.badgeColor.text} ${p.badgeColor.border}`}>
                      {p.code}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      {p.categoryLabel}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold font-mono text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/80 shadow-2xs">
                      R$ {effectivePrice.toFixed(2).replace('.', ',')}
                      <span className="text-[10px] font-normal text-slate-500 ml-1">/cons</span>
                    </span>
                  </div>
                </div>

                {/* Título & Descrição */}
                <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                  {p.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                  {p.description}
                </p>

                {/* Tags de Recursos / Dados Retornados (conciso, sem poluição) */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex flex-wrap gap-1.5">
                    {p.highlights.slice(0, 3).map((item, idx) => (
                      <span
                        key={idx}
                        className="text-[10.5px] bg-slate-50 text-slate-600 border border-slate-200/70 px-2 py-0.5 rounded-md truncate max-w-full"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rodapé: Parâmetro de Entrada + Status + Ação */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200/60">
                    {p.inputLabel}
                  </span>
                  {isContracted ? (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Liberado
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Não Contratado
                    </span>
                  )}
                </div>

                {isContracted ? (
                  <button
                    onClick={() => handleConsultar(p.code)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition shadow-2xs cursor-pointer"
                  >
                    Consultar →
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      toast.info(`O produto ${p.code} (${p.name}) não está ativo no seu plano. Entre em contato com seu gestor comercial.`);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition cursor-pointer"
                  >
                    Solicitar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <p className="text-sm font-medium text-slate-900">Nenhum produto localizado</p>
          <p className="text-xs text-slate-500 mt-1">Não encontramos nenhum serviço correspondente a &quot;{searchTerm}&quot;.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('todos');
            }}
            className="mt-4 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            Limpar Filtros
          </button>
        </div>
      )}
    </div>
  );
}
