import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PRODUCTS_CATALOG, CATEGORIES_CONFIG } from '../config/productsCatalog';

export default function Home() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  const destinationPath = user ? (user.isSuperAdmin ? '/admin' : '/dashboard') : '/login';
  const ctaText = user ? 'Acessar Painel' : 'Acessar Plataforma';

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'todos') return PRODUCTS_CATALOG;
    return PRODUCTS_CATALOG.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between antialiased">
      {/* Navegação Superior */}
      <header className="border-b border-slate-100 bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-20 sm:h-24 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center">
            <img
              src="/logo-semfundo.png"
              alt="Renacred - Rede Nacional de Proteção ao Crédito"
              className="h-14 sm:h-16 w-auto object-contain"
            />
          </Link>

          <nav className="hidden md:flex items-center space-x-7 text-xs font-semibold uppercase tracking-wider text-slate-600">
            <a href="#solucoes" className="hover:text-slate-900 transition-colors">
              Soluções
            </a>
            <a href="#catalogo" className="hover:text-slate-900 transition-colors">
              Catálogo (16 Produtos)
            </a>
            <a href="#diferenciais" className="hover:text-slate-900 transition-colors">
              Garantia Custo Zero
            </a>
            <a href="#api" className="hover:text-slate-900 transition-colors">
              API REST
            </a>
            <a href="#cobertura" className="hover:text-slate-900 transition-colors">
              Cobertura
            </a>
            <a href="#contato" className="hover:text-slate-900 transition-colors">
              Contato
            </a>
          </nav>

          <div className="flex items-center space-x-4">
            <Link
              to={destinationPath}
              className="bg-[#1D4ED8] hover:bg-[#1E40AF] active:bg-[#172554] text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg transition-colors shadow-xs inline-flex items-center"
            >
              <span>{ctaText}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Principal */}
        <section className="py-16 lg:py-24 px-6 max-w-7xl mx-auto">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-700 mb-3 font-mono">
              Rede Nacional de Proteção ao Crédito • Bureau Oficial
            </p>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6">
              Infraestrutura de inteligência patrimonial, veicular e cadastral.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-8 max-w-3xl">
              A Renacred centraliza dados oficiais de 16 bases federais, estaduais e cartorárias em tempo real. Histórico imobiliário (DOI), titularidade e frotas de veículos, infrações RENAINF, restrições RENAJUD e raio-x cadastral com cobrança estritamente por consulta e garantia de custo zero para buscas sem registros.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-12">
              <Link
                to={destinationPath}
                className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold px-6 py-3.5 rounded-lg transition-colors shadow-xs text-center inline-flex items-center justify-center"
              >
                <span>{ctaText}</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <a
                href="#catalogo"
                className="border border-slate-300 hover:border-slate-400 bg-white text-slate-800 text-sm font-semibold px-6 py-3.5 rounded-lg transition-colors text-center"
              >
                Explorar os 16 Produtos Oficiais
              </a>
            </div>

            {/* Barra de Garantias Corporativas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-8 border-t border-slate-200">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Portfólio</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">16 Bases Integradas</span>
                <span className="text-[11px] text-slate-500 block">Imóveis, veículos, CPF e RG</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Faturamento</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">Garantia Custo Zero</span>
                <span className="text-[11px] text-slate-500 block">R$ 0,00 se nada for localizado</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Resiliência</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">Contingência Ativa</span>
                <span className="text-[11px] text-slate-500 block">Fallback automático entre órgãos</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Performance</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">SLA Sub-Segundo</span>
                <span className="text-[11px] text-slate-500 block">API REST com token e webhook</span>
              </div>
            </div>
          </div>
        </section>

        {/* As 4 Verticais Estratégicas */}
        <section id="solucoes" className="border-t border-slate-100 bg-slate-50/70 py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-12 max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
                Quatro verticais completas de inteligência cadastral e pericial
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Dados consolidados diretamente dos registros públicos, serventias notariais e bases governamentais para subsidiar decisões críticas de negócios.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded inline-block mb-3">
                    VERT-01 • IMOBILIÁRIO
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    Histórico Imobiliário & Cartórios
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Varredura nacional de Declarações de Operações Imobiliárias (DOI), alienações, matrículas, livros, folhas e serventias de registro vinculadas ao CPF ou CNPJ.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-500">
                  Produto: E1 (DOI Nacional)
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded inline-block mb-3">
                    VERT-02 • VEICULAR
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    Frotas, Proprietários & RENAINF
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Rastreamento de histórico de proprietários anteriores, frotas registradas por documento, comunicação de venda, multas nacionais (RENAINF), BIN Online e gravames SNG.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-500">
                  Produtos: E2, E3, E4, E5, E8, E10, E12, E14
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded inline-block mb-3">
                    VERT-03 • CADASTRAL
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    CNH, Vínculos Parentais & RG
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Acesso a espelho de CNH com imagem oficial, situação cadastral na Receita Federal, histórico de endereços, contatos, vínculos de parentesco de 1º grau e localização por RG.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-500">
                  Produtos: E6, E7, E11, E13, E15, E16
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded inline-block mb-3">
                    VERT-04 • JURÍDICO
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    RENAJUD & Restrições Judiciais
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Identificação imediata de bloqueios de circulação, transferências impedidas, penhoras e ordens judiciais emitidas por varas cíveis, trabalhistas e federais.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-500">
                  Produto: E9 (RENAJUD Oficial)
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Catálogo Interativo dos 16 Produtos Oficiais */}
        <section id="catalogo" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-100">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Portfólio Oficial Completo
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Catálogo de Consultas (E1 ao E16)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                Todos os produtos contam com laudo pericial gerado em tempo real com hash criptográfico de autenticidade e exportação em PDF e Excel.
              </p>
            </div>

            {/* Filtro por Categoria */}
            <div className="flex flex-wrap items-center gap-1.5">
              {CATEGORIES_CONFIG.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      active
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`ml-1.5 font-mono text-[10px] ${active ? 'text-slate-300' : 'text-slate-400'}`}>
                      ({cat.count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid de Cards dos Produtos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredProducts.map((p) => (
              <div
                key={p.code}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${p.badgeColor.bg} ${p.badgeColor.text} ${p.badgeColor.border}`}
                    >
                      {p.code}
                    </span>
                    <span className="font-mono text-[10px] uppercase text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60">
                      {p.inputType}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 mb-1 leading-snug">
                    {p.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-3 mb-3 leading-relaxed">
                    {p.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Entrada:</span>
                    <span className="font-semibold text-slate-700 font-mono text-[10px]">
                      {p.inputLabel}
                    </span>
                  </div>
                  {p.hasContingency && (
                    <div className="mt-1 text-[10px] text-emerald-800 font-semibold">
                      Contingência ativa
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              to={destinationPath}
              className="inline-flex items-center space-x-2 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/70 border border-blue-200 px-5 py-2.5 rounded-lg transition"
            >
              <span>Acessar plataforma para consultar qualquer produto</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Diferencial: Garantia Rigorosa de Custo Zero */}
        <section id="diferenciais" className="py-20 px-6 bg-slate-900 text-white">
          <div className="max-w-5xl mx-auto">
            <div className="border-b border-slate-800 pb-10 mb-10">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono block mb-2">
                Compromisso com o Assinante
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Se a base oficial não tiver dados, o custo da sua consulta é rigorosamente R$ 0,00.
              </h2>
              <p className="text-sm sm:text-base text-slate-400 mt-4 leading-relaxed max-w-3xl">
                Diferente de bureaus tradicionais que cobram pela simples execução da requisição mesmo em laudos vazios, a Renacred adota a regra de cobrança por resultado. Zero registros = zero débito.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h4 className="text-sm font-bold text-white mb-2">
                  Tarifação por Consulta Efetiva
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pague apenas pelas informações que realmente agregam valor à sua esteira. Planos pré-pagos ou faturamento mensal pós-pago.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-2">
                  Laudos com Fé Pública
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cada resposta gera um hash criptográfico irretratável para auditorias internas, processos judiciais e conformidade com compliance.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-2">
                  Segurança e Sigilo Absoluto
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Conexões criptografadas de ponta a ponta e total conformidade com as diretrizes da LGPD (Lei 13.709/2018).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Integração via API REST */}
        <section id="api" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-100">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-700 font-mono block mb-2">
                Integração RESTful
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-4">
                Conecte os 16 produtos ao seu ERP ou esteira de crédito
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Endpoints universais com suporte a requisições via GET e POST. Autenticação por cabeçalho <code className="font-mono text-slate-800">x-api-key</code> ou query param <code className="font-mono text-slate-800">?token=</code>.
              </p>
              <div className="space-y-2 text-xs text-slate-700 mb-8">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  <span>Base URL Oficial: <strong className="font-mono">https://api.renacred.com.br/v1</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  <span>Formato Padronizado de Resposta: JSON estruturado</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  <span>Playground e documentação completa com snippets em 6 linguagens</span>
                </div>
              </div>
              <Link
                to={destinationPath}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-lg transition-colors inline-flex items-center"
              >
                <span>Acessar Documentação Técnica</span>
                <ArrowRight className="w-3.5 h-3.5 ml-2" />
              </Link>
            </div>

            <div className="lg:col-span-7">
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 font-mono text-xs text-slate-200 overflow-x-auto shadow-lg">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400 text-[11px]">
                  <span>EXEMPLO DE REQUISIÇÃO • cURL</span>
                  <span className="text-emerald-400">HTTP 200 OK</span>
                </div>
                <pre className="text-slate-300 leading-relaxed">{`# Consulta de Frota Veicular por CPF (Produto E3):
curl -X GET "https://api.renacred.com.br/v1/e3?token=SUA_CHAVE_API&query=01036115925"

# Resposta JSON estruturada das bases oficiais:
{
  "success": true,
  "produto": { "codigo": "E3", "nome": "Busca de Frota Veicular" },
  "total_registros": 1,
  "custo_debitado": 1.32,
  "tempo_resposta_ms": 518,
  "hash_autenticacao": "RNC-E3-095CD0FCF1-20260924",
  "dados": {
    "documento": "01036115925",
    "quantidade_veiculos": 1,
    "veiculos": [
      {
        "placa": "TAT2E88",
        "marca_modelo": "I/GWM WEY 07",
        "ano_fabricacao": "2025",
        "situacao": "CIRCULACAO"
      }
    ]
  }
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* Setores Atendidos */}
        <section id="cobertura" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-100">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono block mb-2">
                Casos de Uso
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-4">
                Desenvolvido para operações de alto volume e rigor técnico
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Nossos dados apoiam a esteira operacional de setores que exigem verificação prévia de solidez patrimonial e conformidade regulatória.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl border border-slate-200 bg-white">
                <h4 className="text-sm font-bold text-slate-900 mb-1.5">
                  Instituições Financeiras & Fintechs
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Validação de garantias imobiliárias, capacidade patrimonial e composição de frotas em operações de crédito.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-slate-200 bg-white">
                <h4 className="text-sm font-bold text-slate-900 mb-1.5">
                  Locadoras de Veículos & Concessionárias
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Checagem de histórico de proprietários, bloqueios judiciais RENAJUD, multas RENAINF e histórico de sinistros.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-slate-200 bg-white">
                <h4 className="text-sm font-bold text-slate-900 mb-1.5">
                  Escritórios Jurídicos & Perícias
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Due diligence imobiliária, inventários, ações de execução patrimonial e localização de bens sob custódia.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-slate-200 bg-white">
                <h4 className="text-sm font-bold text-slate-900 mb-1.5">
                  Recuperação de Crédito & Cobrança
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enriquecimento cadastral, localização de telefones, endereços atualizados, parentescos e raio-x completo do titular.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contato Institucional */}
        <section id="contato" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-100">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono block mb-2">
              Atendimento Corporativo
            </span>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-3">
              Novo convênio empresarial ou acesso em lote
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Sua organização precisa de tarifação diferenciada por volume ou integração sob medida com a esteira corporativa? Nossa equipe de relacionamento está à disposição.
            </p>
            <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <p>
                <strong className="text-slate-900">Atendimento institucional:</strong> Segunda a sexta-feira, das 09h às 18h (horário de Brasília).
              </p>
              <p>
                <strong className="text-slate-900">Privacidade & Conformidade:</strong> Operações em estrito cumprimento à Lei Geral de Proteção de Dados Pessoais (LGPD - Lei 13.709/2018).
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Rodapé Corporativo */}
      <footer className="border-t border-slate-100 bg-white py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 text-center sm:text-left">
            <img
              src="/logo-semfundo.png"
              alt="Renacred"
              className="h-12 w-auto object-contain"
            />
            <span>© {new Date().getFullYear()} Renacred. Todos os direitos reservados.</span>
          </div>

          <div className="flex items-center space-x-6 font-mono text-[11px]">
            <span className="text-slate-400">Rede Nacional de Proteção ao Crédito</span>
            <Link to="/login" className="text-blue-700 hover:underline font-semibold">
              Área do Assinante →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
