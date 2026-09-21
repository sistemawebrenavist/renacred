import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const { user } = useAuth();

  const destinationPath = user ? (user.isSuperAdmin ? '/admin' : '/dashboard') : '/login';
  const ctaText = user ? 'Acessar Painel' : 'Acessar Plataforma';

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between antialiased">
      {/* Navegação Superior */}
      <header className="border-b border-slate-100 bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-24 sm:h-28 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center">
            <img
              src="/logo-semfundo.png"
              alt="Renacred - Rede Nacional de Proteção ao Crédito"
              className="h-16 sm:h-20 w-auto object-contain"
            />
          </Link>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
            <a href="#solucoes" className="hover:text-slate-900 transition-colors">
              Soluções
            </a>
            <a href="#cobertura" className="hover:text-slate-900 transition-colors">
              Cobertura
            </a>
            <a href="#api" className="hover:text-slate-900 transition-colors">
              API
            </a>
            <a href="#contato" className="hover:text-slate-900 transition-colors">
              Contato
            </a>
          </nav>

          <div className="flex items-center space-x-4">
            <Link
              to={destinationPath}
              className="bg-[#1D4ED8] hover:bg-[#1E40AF] active:bg-[#172554] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm inline-flex items-center"
            >
              <span>{ctaText}</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Principal */}
      <main className="flex-1">
        <section className="py-20 lg:py-28 px-6 max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Rede Nacional de Proteção ao Crédito
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.15] mb-6">
              Infraestrutura de dados cartorários e histórico imobiliário.
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              A Renacred centraliza informações de declarações de operações imobiliárias (DOI), alienações e registros de imóveis em todo o Brasil para subsidiar análises de crédito, risco patrimonial e conformidade jurídica.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <Link
                to={destinationPath}
                className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-base font-medium px-6 py-3.5 rounded-lg transition-colors shadow-sm text-center inline-flex items-center justify-center"
              >
                <span>{ctaText}</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <a
                href="#solucoes"
                className="border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 text-base font-medium px-6 py-3.5 rounded-lg transition-colors text-center"
              >
                Conhecer as consultas
              </a>
            </div>
          </div>
        </section>

        {/* Três Pilares Editoriais (Sem badges ou cards idênticos de IA) */}
        <section id="solucoes" className="border-t border-slate-100 bg-slate-50/60 py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-14 max-w-xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">
                Informações consolidadas para decisões seguras
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Dados estruturados diretamente a partir de registros notariais e declarações oficiais para empresas e instituições financeiras.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  Pesquisa por CPF e CNPJ
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Identifique transmissões de propriedade, valores declarados de transação, identificação de partes (adquirentes e alienantes) e serventias de registro.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  Dossiê e Registro Auditável
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Geração de comprovantes oficiais e extratos detalhados com identificador exclusivo para arquivamento e comprovação em auditorias internas.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  Integração via API REST
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Conexão direta aos seus sistemas de análise de risco e concessão de crédito. Autenticação por token Bearer com alta disponibilidade e documentação clara.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Setores Atendidos */}
        <section id="cobertura" className="py-20 px-6 max-w-6xl mx-auto border-t border-slate-100">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-4">
                Desenvolvido para operações de alto valor
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Nossos dados apoiam a esteira operacional de setores que exigem rigor documental e verificação prévia de solidez patrimonial.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl border border-slate-200 bg-white">
                <h4 className="text-sm font-semibold text-slate-900 mb-1.5">
                  Instituições Financeiras & Fintechs
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Validação de garantias imobiliárias, capacidade patrimonial e composição de renda em operações de crédito.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-slate-200 bg-white">
                <h4 className="text-sm font-semibold text-slate-900 mb-1.5">
                  Imobiliárias & Loteadoras
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Checagem de titularidade e histórico prévio de alienações antes de fechar negócios de compra e venda.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-slate-200 bg-white">
                <h4 className="text-sm font-semibold text-slate-900 mb-1.5">
                  Escritórios Jurídicos
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Due diligence imobiliária, inventários, execuções e localização de patrimônio sob custódia legal.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-slate-200 bg-white">
                <h4 className="text-sm font-semibold text-slate-900 mb-1.5">
                  Birôs de Crédito & Cobrança
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enriquecimento cadastral e cruzamento de solvência com histórico imobiliário consolidado.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* API Bloco Minimalista */}
        <section id="api" className="py-20 px-6 bg-slate-50 border-t border-slate-100">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-4">
              API rápida para esteiras automatizadas
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto mb-8">
              Documentação completa e chaves de API disponíveis no painel corporativo. Respostas estruturadas em milissegundos para manter sua esteira ágil.
            </p>
            <Link
              to="/login"
              className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-5 py-3 rounded-lg transition-colors inline-flex items-center"
            >
              <span>Acessar portal da API</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </div>
        </section>

        {/* Contato e Novos Acessos */}
        <section id="contato" className="py-20 px-6 max-w-6xl mx-auto border-t border-slate-100">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-3">
              Novo convênio corporativo
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Sua empresa precisa de acesso em lote ou integração personalizada com a base de histórico imobiliário? Converse com nossa equipe comercial.
            </p>
            <div className="text-sm text-slate-700 space-y-1">
              <p>
                <span className="font-semibold">Atendimento institucional:</span> Horário comercial (segunda a sexta, das 9h às 18h).
              </p>
              <p>
                <span className="font-semibold">Conformidade:</span> Em estrito cumprimento à Lei Geral de Proteção de Dados (Lei 13.709/2018).
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Rodapé Minimalista */}
      <footer className="border-t border-slate-100 bg-white py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 text-center sm:text-left">
            <img
              src="/logo-semfundo.png"
              alt="Renacred"
              className="h-14 sm:h-16 w-auto object-contain"
            />
            <span>© {new Date().getFullYear()} Renacred. Todos os direitos reservados.</span>
          </div>

          <div className="flex items-center space-x-6">
            <span>Rede Nacional de Proteção ao Crédito</span>
            <Link to="/login" className="hover:text-slate-900 transition-colors font-medium">
              Área do Assinante
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

