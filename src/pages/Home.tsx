import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Code2,
  Copy,
  Check,
  CheckCircle,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PRODUCTS_CATALOG, CATEGORIES_CONFIG } from '../config/productsCatalog';

type DemoEndpointKey = 'e1' | 'e3' | 'e9' | 'e5';
type DemoLangKey = 'curl' | 'node' | 'python';

interface DemoConfig {
  id: DemoEndpointKey;
  label: string;
  endpoint: string;
  latency: string;
  code: Record<DemoLangKey, string>;
  responseSample: Record<string, any>;
}

const DEMO_CONFIGS: Record<DemoEndpointKey, DemoConfig> = {
  e1: {
    id: 'e1',
    label: 'Imobiliário (DOI)',
    endpoint: 'GET /v1/e1?query=01036115925',
    latency: '348ms',
    code: {
      curl: `curl -X GET "https://[ENDPOINT_API]/v1/e1?token=SUA_CHAVE&query=01036115925"`,
      node: `const res = await axios.get('https://[ENDPOINT_API]/v1/e1', {
  headers: { 'x-api-key': process.env.RENACRED_KEY },
  params: { query: '01036115925' }
});
console.log(res.data.dados.declaracoes);`,
      python: `import requests
res = requests.get(
    "https://[ENDPOINT_API]/v1/e1",
    headers={"x-api-key": "SUA_CHAVE"},
    params={"query": "01036115925"}
)
print(res.json()["dados"])`
    },
    responseSample: {
      success: true,
      produto: "E1 - Histórico Imobiliário & Cartórios (DOI)",
      registros: 1,
      custo_debitado: 5.00,
      tempo_ms: 348,
      dados: {
        documento: "01036115925",
        imoveis_localizados: 1,
        declaracoes: [
          {
            cartorio: "1º Registro de Imóveis de Curitiba",
            matricula: "108.432",
            tipo_operacao: "Compra e Venda",
            data_lavratura: "2024-03-12"
          }
        ]
      }
    }
  },
  e3: {
    id: 'e3',
    label: 'Frota Veicular',
    endpoint: 'GET /v1/e3?query=01036115925',
    latency: '412ms',
    code: {
      curl: `curl -X GET "https://[ENDPOINT_API]/v1/e3?token=SUA_CHAVE&query=01036115925"`,
      node: `const res = await axios.get('https://[ENDPOINT_API]/v1/e3', {
  headers: { 'x-api-key': process.env.RENACRED_KEY },
  params: { query: '01036115925' }
});
console.log(res.data.dados.veiculos);`,
      python: `import requests
res = requests.get(
    "https://[ENDPOINT_API]/v1/e3",
    headers={"x-api-key": "SUA_CHAVE"},
    params={"query": "01036115925"}
)
print(res.json()["dados"]["veiculos"])`
    },
    responseSample: {
      success: true,
      produto: "E3 - Busca de Frota Veicular",
      registros: 1,
      custo_debitado: 1.32,
      tempo_ms: 412,
      dados: {
        documento: "01036115925",
        quantidade_veiculos: 1,
        veiculos: [
          {
            placa: "TAT2E88",
            marca_modelo: "I/GWM WEY 07",
            ano_modelo: "2025",
            situacao: "CIRCULACAO"
          }
        ]
      }
    }
  },
  e9: {
    id: 'e9',
    label: 'RENAJUD (Judicial)',
    endpoint: 'GET /v1/e9?query=ABC1D23',
    latency: '520ms',
    code: {
      curl: `curl -X GET "https://[ENDPOINT_API]/v1/e9?token=SUA_CHAVE&query=ABC1D23"`,
      node: `const res = await axios.get('https://[ENDPOINT_API]/v1/e9', {
  headers: { 'x-api-key': process.env.RENACRED_KEY },
  params: { query: 'ABC1D23' }
});
console.log(res.data.dados.restricoes);`,
      python: `import requests
res = requests.get(
    "https://[ENDPOINT_API]/v1/e9",
    headers={"x-api-key": "SUA_CHAVE"},
    params={"query": "ABC1D23"}
)
print(res.json()["dados"])`
    },
    responseSample: {
      success: true,
      produto: "E9 - Restrições Judiciais RENAJUD",
      registros: 1,
      custo_debitado: 1.32,
      tempo_ms: 520,
      dados: {
        placa: "ABC1D23",
        possui_restricao_judicial: true,
        restricoes: [
          {
            tipo: "BLOQUEIO DE TRANSFERENCIA",
            tribunal: "TRT - 9ª Região",
            processo: "0001248-12.2024.5.09.0001"
          }
        ]
      }
    }
  },
  e5: {
    id: 'e5',
    label: 'Raio-X Cadastral',
    endpoint: 'GET /v1/e5?query=01036115925',
    latency: '290ms',
    code: {
      curl: `curl -X GET "https://[ENDPOINT_API]/v1/e5?token=SUA_CHAVE&query=01036115925"`,
      node: `const res = await axios.get('https://[ENDPOINT_API]/v1/e5', {
  headers: { 'x-api-key': process.env.RENACRED_KEY },
  params: { query: '01036115925' }
});
console.log(res.data.dados);`,
      python: `import requests
res = requests.get(
    "https://[ENDPOINT_API]/v1/e5",
    headers={"x-api-key": "SUA_CHAVE"},
    params={"query": "01036115925"}
)
print(res.json()["dados"])`
    },
    responseSample: {
      success: true,
      produto: "E5 - Cadastro Completo",
      registros: 1,
      custo_debitado: 1.32,
      tempo_ms: 290,
      dados: {
        cpf: "01036115925",
        nome: "CARLOS EDUARDO SILVEIRA",
        situacao_receita: "REGULAR",
        data_nascimento: "1984-07-19",
        nome_mae: "MARIA HELENA SILVEIRA"
      }
    }
  }
};

export default function Home() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [activeDemo, setActiveDemo] = useState<DemoEndpointKey>('e1');
  const [activeLang, setActiveLang] = useState<DemoLangKey>('curl');
  const [copiedCode, setCopiedCode] = useState(false);

  const destinationPath = user ? (user.isSuperAdmin ? '/admin' : '/dashboard') : '/login';
  const ctaText = user ? 'Acessar Painel' : 'Acessar Plataforma';

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'todos') return PRODUCTS_CATALOG;
    return PRODUCTS_CATALOG.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  const currentDemo = DEMO_CONFIGS[activeDemo];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentDemo.code[activeLang]);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const whatsappUrl = "https://wa.me/554196609987?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20a%20API%20da%20Renacred.";

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between antialiased">
      {/* Navegação Superior Limpa (Apenas 3 Links e Botão de Ação) */}
      <header className="border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center">
            <img
              src="/logo-semfundo.png"
              alt="Renacred"
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </Link>

          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold uppercase tracking-wider text-slate-600">
            <a href="#api" className="hover:text-slate-900 transition-colors">
              API REST
            </a>
            <a href="#consultas" className="hover:text-slate-900 transition-colors">
              Consultas
            </a>
            <a href="#planos" className="hover:text-slate-900 transition-colors">
              Planos
            </a>
          </nav>

          <div className="flex items-center space-x-4">
            <Link
              to={destinationPath}
              className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition shadow-xs inline-flex items-center"
            >
              <span>{ctaText}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Simples e Direto - Foco em Venda de API */}
        <section className="py-16 lg:py-24 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Texto Comercial */}
            <div className="lg:col-span-6 space-y-6">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                API de inteligência patrimonial, veicular e cadastral.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Conecte suas esteiras de crédito e sistemas às bases oficiais de cartórios (DOI), frotas de veículos e registros federais. Respostas estruturadas em JSON de alta velocidade para decisões críticas de risco.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-2">
                <Link
                  to={destinationPath}
                  className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold px-6 py-3.5 rounded-xl transition shadow-xs text-center inline-flex items-center justify-center space-x-2"
                >
                  <span>Acessar Plataforma</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#consultas"
                  className="border border-slate-300 hover:border-slate-400 bg-white text-slate-800 text-sm font-semibold px-6 py-3.5 rounded-xl transition text-center shadow-xs"
                >
                  Ver Consultas Disponíveis
                </a>
              </div>

              {/* Informações de Confiança Sem Poluição Visual */}
              <div className="pt-4 text-xs text-slate-500 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  <span><strong>Alta Performance:</strong> tempo de resposta médio sub-segundo (&lt; 500ms).</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span><strong>Autenticidade Oficial:</strong> laudos arquivados em PDF e Excel com hash de autenticidade.</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  <span><strong>Conformidade LGPD:</strong> infraestrutura segura com autenticação via chaves de acesso.</span>
                </div>
              </div>
            </div>

            {/* Terminal de API Limpo */}
            <div className="lg:col-span-6">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                {/* Header do Terminal */}
                <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="font-mono text-xs text-slate-400 ml-2">Console API REST</span>
                  </div>

                  <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                    200 OK • {currentDemo.latency}
                  </span>
                </div>

                {/* Abas Simples de Consultas */}
                <div className="bg-slate-900/60 px-4 py-2 border-b border-slate-800/80 flex items-center space-x-2 overflow-x-auto text-xs font-mono">
                  {(Object.keys(DEMO_CONFIGS) as DemoEndpointKey[]).map((key) => {
                    const item = DEMO_CONFIGS[key];
                    const active = activeDemo === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveDemo(key)}
                        className={`px-2.5 py-1 rounded transition whitespace-nowrap text-xs ${
                          active
                            ? 'bg-[#1D4ED8] text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {/* Seletor de Linguagem e Copiar */}
                <div className="bg-slate-950 px-4 py-2 border-b border-slate-900 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 font-mono text-[11px]">
                    {(['curl', 'node', 'python'] as DemoLangKey[]).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setActiveLang(lang)}
                        className={`px-2 py-0.5 rounded transition uppercase ${
                          activeLang === lang
                            ? 'text-blue-400 font-bold bg-blue-950/60'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {lang === 'node' ? 'Node.js' : lang}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleCopyCode}
                    className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-white transition"
                    title="Copiar código"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Código */}
                <div className="p-4 bg-slate-950 text-xs font-mono overflow-x-auto border-b border-slate-900">
                  <pre className="text-slate-300 leading-relaxed">
                    {currentDemo.code[activeLang]}
                  </pre>
                </div>

                {/* Resposta JSON */}
                <div className="p-4 bg-slate-900/50 text-xs font-mono overflow-x-auto max-h-48">
                  <pre className="text-emerald-300/90 leading-relaxed">
                    {JSON.stringify(currentDemo.responseSample, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Seção 1: Os 3 Pilares da API */}
        <section id="api" className="py-20 px-6 bg-slate-50 border-t border-slate-100">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-2xl mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                Construído para simplificar integrações corporativas
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Menos burocracia, mais eficiência. Uma API moderna pronta para plugar em qualquer esteira.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Tarifação Transparente
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cobrança clara por consulta realizada. Sem taxas de adesão, sem surpresas no faturamento e total controle de consumo.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Integração em Poucos Minutos
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Autenticação via header <code className="font-mono text-slate-800">x-api-key</code>, JSON estruturado e contingência automática com disponibilidade contínua.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Laudos Oficiais com Autenticidade
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Todas as consultas emitem laudos periciais em PDF e Excel com hash de autenticidade para fins de compliance e auditorias.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Seção 2: Consultas Disponíveis */}
        <section id="consultas" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-100">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Consultas Disponíveis
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
                Acesse pelo painel web ou automatize via chamadas de API REST.
              </p>
            </div>

            {/* Filtros Simples */}
            <div className="flex flex-wrap items-center gap-1.5">
              {CATEGORIES_CONFIG.map((cat) => {
                const active = selectedCategory === cat.id;
                const label = cat.id === 'todos' ? 'Todas' : cat.label;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      active
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid de Consultas Limpo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredProducts.map((p) => (
              <div
                key={p.code}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {p.code}
                    </span>
                    <span className="text-[10px] uppercase font-mono text-slate-400">
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

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>GET /v1/{p.code.toLowerCase()}</span>
                  <span className="text-slate-400">{p.inputLabel}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              to={destinationPath}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#1D4ED8] hover:underline"
            >
              <span>Acessar plataforma para consultar &rarr;</span>
            </Link>
          </div>
        </section>

        {/* Seção 3: Planos */}
        <section id="planos" className="py-20 px-6 bg-slate-50 border-t border-slate-100">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Modelos de Contratação
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Sem taxas de adesão. Escolha o formato que melhor se adapta à sua esteira.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pré-Pago */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">
                    Pré-Pago Sob Demanda
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Ideal para desenvolvedores e validação de esteiras.
                  </p>

                  <div className="text-2xl font-extrabold text-slate-900 font-mono mb-4">
                    R$ 0,00 <span className="text-xs font-normal text-slate-400">mensal</span>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-600 mb-6">
                    <li className="flex items-center">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mr-2 shrink-0" />
                      <span>Recargas instantâneas via Pix</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mr-2 shrink-0" />
                      <span>Geração imediata de Chave de API</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mr-2 shrink-0" />
                      <span>Sem mensalidade e sem contrato de fidelidade</span>
                    </li>
                  </ul>
                </div>

                <Link
                  to={destinationPath}
                  className="w-full py-3 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white transition text-center"
                >
                  Obter Chave de API
                </Link>
              </div>

              {/* Pós-Pago */}
              <div className="bg-white border-2 border-blue-600 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">
                    Pós-Pago Faturado
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Para empresas com esteiras de médio e alto volume.
                  </p>

                  <div className="text-2xl font-extrabold text-[#1D4ED8] font-mono mb-4">
                    Faturado a 30 dias
                  </div>

                  <ul className="space-y-2 text-xs text-slate-600 mb-6">
                    <li className="flex items-center">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-600 mr-2 shrink-0" />
                      <span>Tarifas unitárias regressivas por volume</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-600 mr-2 shrink-0" />
                      <span>Fatura mensal com emissão de Nota Fiscal</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-600 mr-2 shrink-0" />
                      <span>Suporte técnico de engenharia via WhatsApp</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-600 mr-2 shrink-0" />
                      <span>Múltiplas chaves de acesso para ambientes</span>
                    </li>
                  </ul>
                </div>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-xl font-bold text-xs bg-[#1D4ED8] hover:bg-[#1E40AF] text-white transition text-center flex items-center justify-center space-x-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Falar com Atendimento</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Rodapé Simples */}
      <footer className="border-t border-slate-100 bg-white py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-3">
            <img
              src="/logo-semfundo.png"
              alt="Renacred"
              className="h-10 w-auto object-contain"
            />
            <span>© {new Date().getFullYear()} Renacred. Todos os direitos reservados.</span>
          </div>

          <div className="flex items-center space-x-6 text-[11px]">
            <span>Rede Nacional de Proteção ao Crédito</span>
            <Link to="/login" className="text-[#1D4ED8] hover:underline font-semibold">
              Área do Assinante &rarr;
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
