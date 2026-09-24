import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { PRODUCTS_CATALOG, CATEGORIES_CONFIG, ProductCategory } from '../../config/productsCatalog';

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
      {/* Cabeçalho Institucional */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Catálogo de Produtos Oficiais
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl">
              Portfólio de inteligência patrimonial, cadastral e veicular da Renacred. Pesquisas oficiais em tempo real com cobrança por consulta individualizada e garantia de custo zero para consultas sem dados.
            </p>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg text-right">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                {user?.company?.accountType === 'POST_PAID' ? 'Faturamento Mensal' : 'Saldo Pré-pago'}
              </span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {user?.company?.accountType === 'POST_PAID'
                  ? `Vencimento dia ${user?.company?.billingDueDate || 10}`
                  : `R$ ${Number(user?.company?.creditsBalance || 0).toFixed(2).replace('.', ',')}`}
              </span>
            </div>
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
              placeholder="Filtrar por nome, placa, CPF ou termo..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 focus:bg-white transition"
            />
          </div>
        </div>
      </div>

      {/* Grid de Cards dos Produtos (Padrão Impeccable) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((p) => {
          const allowedProducts: string[] = user?.company?.allowedProducts || ['ALL'];
          const isContracted = !!user?.isSuperAdmin || allowedProducts.includes('ALL') || allowedProducts.includes(p.code);
          const customPrices = (user?.company?.customPrices as Record<string, number>) || {};
          const effectivePrice = user?.isSuperAdmin
            ? 0
            : (typeof customPrices[p.code] === 'number'
                ? customPrices[p.code]
                : (user?.company?.customQueryPrice ? Number(user.company.customQueryPrice) : p.defaultPrice));

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
                {/* Cabeçalho do Card */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono border ${p.badgeColor.bg} ${p.badgeColor.text} ${p.badgeColor.border}`}>
                      {p.code}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      {p.categoryLabel}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {isContracted ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Liberado
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Não Contratado
                      </span>
                    )}
                  </div>
                </div>

                {/* Título & Descrição */}
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {p.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {p.description}
                </p>

                {/* Destaques dos Dados */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Dados Retornados no Laudo
                  </span>
                  <ul className="space-y-1.5">
                    {p.highlights.slice(0, 3).map((item, idx) => (
                      <li key={idx} className="text-[11px] text-slate-600 flex items-start">
                        <span className="text-blue-600 mr-1.5 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Rodapé Tarifário & Ação */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Entrada: {p.inputLabel}</div>
                  <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                    R$ {effectivePrice.toFixed(2).replace('.', ',')}
                    <span className="text-[10px] font-normal text-slate-500 ml-1">/ consulta</span>
                  </div>
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
                    Solicitar Liberação
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
