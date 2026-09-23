import React, { useState } from 'react';
import { 
  FileCode2, 
  Terminal, 
  Copy, 
  Check, 
  ShieldCheck, 
  Play, 
  Layers, 
  AlertTriangle,
  Code2,
  Building2,
  Car
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';

export default function PortalDevDocs() {
  const [activeProduct, setActiveProduct] = useState<'E1' | 'E2'>('E1');
  const [copiedLang, setCopiedLang] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<'url_get' | 'curl' | 'node' | 'python' | 'php' | 'csharp'>('url_get');

  // Playground E1
  const [testDoc, setTestDoc] = useState('01036115925');
  const [testResponseE1, setTestResponseE1] = useState<string | null>(null);
  const [testingE1, setTestingE1] = useState(false);

  // Playground E2
  const [testPlaca, setTestPlaca] = useState('ATT0849');
  const [testResponseE2, setTestResponseE2] = useState<string | null>(null);
  const [testingE2, setTestingE2] = useState(false);

  const copyCode = (code: string, lang: string) => {
    navigator.clipboard.writeText(code);
    setCopiedLang(lang);
    toast.success('Código copiado para a área de transferência!');
    setTimeout(() => setCopiedLang(null), 2000);
  };

  const e1CodeSnippets = {
    url_get: `# 1. Chamada direta via GET (pode ser colada no navegador, webhook ou ERP):
https://api.renacred.com.br/v1/imobiliario/historico?token=SUA_CHAVE_API&query=01036115925

# 2. Chamada com parâmetro de serviço compatível:
https://api.renacred.com.br/v1/imobiliario/historico?token=SUA_CHAVE_API&api=historico_imobiliario&query=01036115925`,

    curl: `curl -X GET "https://api.renacred.com.br/v1/imobiliario/historico?token=SUA_CHAVE_API&query=01036115925"`,

    node: `const axios = require('axios');

async function consultarImobiliario() {
  try {
    const response = await axios.post(
      'https://api.renacred.com.br/v1/imobiliario/historico',
      { query: '01036115925' },
      { headers: { 'x-api-key': 'SUA_CHAVE_API_AQUI' } }
    );
    console.log(response.data);
  } catch (error) {
    console.error('Erro na requisição:', error.response?.data || error.message);
  }
}

consultarImobiliario();`,

    python: `import requests

url = "https://api.renacred.com.br/v1/imobiliario/historico"
headers = {
    "x-api-key": "SUA_CHAVE_API_AQUI",
    "Content-Type": "application/json"
}
payload = {
    "query": "01036115925"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,

    php: `<?php
$ch = curl_init("https://api.renacred.com.br/v1/imobiliario/historico");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "x-api-key: SUA_CHAVE_API_AQUI",
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "query" => "01036115925"
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

echo $response;`,

    csharp: `using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

class Program {
    static async Task Main() {
        var client = new HttpClient();
        client.DefaultRequestHeaders.Add("x-api-key", "SUA_CHAVE_API_AQUI");

        var json = "{\\"query\\":\\"01036115925\\"}";
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.PostAsync("https://api.renacred.com.br/v1/imobiliario/historico", content);
        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}`
  };

  const e2CodeSnippets = {
    url_get: `# 1. Chamada direta via GET (padrão oficial por placa):
https://api.renacred.com.br/v1/veicular/proprietarios?token=SUA_CHAVE_API&query=ATT0849

# 2. Chamada alternativa passando parâmetro placa:
https://api.renacred.com.br/v1/veicular/proprietarios?token=SUA_CHAVE_API&placa=ATT0849`,

    curl: `curl -X GET "https://api.renacred.com.br/v1/veicular/proprietarios?token=SUA_CHAVE_API&query=ATT0849"`,

    node: `const axios = require('axios');

async function consultarProprietarios() {
  try {
    const response = await axios.post(
      'https://api.renacred.com.br/v1/veicular/proprietarios',
      { placa: 'ATT0849' },
      { headers: { 'x-api-key': 'SUA_CHAVE_API_AQUI' } }
    );
    console.log(response.data);
  } catch (error) {
    console.error('Erro na requisição:', error.response?.data || error.message);
  }
}

consultarProprietarios();`,

    python: `import requests

url = "https://api.renacred.com.br/v1/veicular/proprietarios"
headers = {
    "x-api-key": "SUA_CHAVE_API_AQUI",
    "Content-Type": "application/json"
}
payload = {
    "placa": "ATT0849"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,

    php: `<?php
$ch = curl_init("https://api.renacred.com.br/v1/veicular/proprietarios");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "x-api-key: SUA_CHAVE_API_AQUI",
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "placa" => "ATT0849"
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

echo $response;`,

    csharp: `using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

class Program {
    static async Task Main() {
        var client = new HttpClient();
        client.DefaultRequestHeaders.Add("x-api-key", "SUA_CHAVE_API_AQUI");

        var json = "{\\"placa\\":\\"ATT0849\\"}";
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.PostAsync("https://api.renacred.com.br/v1/veicular/proprietarios", content);
        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}`
  };

  const handleRunPlaygroundE1 = async () => {
    if (!testDoc.trim()) return;
    setTestingE1(true);
    setTestResponseE1(null);
    try {
      const res = await api.post('/api/imobiliario/consultar', { documento: testDoc });
      setTestResponseE1(JSON.stringify(res.data, null, 2));
    } catch (err: any) {
      setTestResponseE1(JSON.stringify(err.response?.data || { error: err.message }, null, 2));
    } finally {
      setTestingE1(false);
    }
  };

  const handleRunPlaygroundE2 = async () => {
    if (!testPlaca.trim()) return;
    setTestingE2(true);
    setTestResponseE2(null);
    try {
      const res = await api.post('/api/veicular/proprietarios', { placa: testPlaca });
      setTestResponseE2(JSON.stringify(res.data, null, 2));
    } catch (err: any) {
      setTestResponseE2(JSON.stringify(err.response?.data || { error: err.message }, null, 2));
    } finally {
      setTestingE2(false);
    }
  };

  const currentSnippets = activeProduct === 'E1' ? e1CodeSnippets : e2CodeSnippets;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Topo / Introdução */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs">
        <div className="flex items-center space-x-2 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Catálogo de APIs & Produtos Oficiais</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Documentação Técnica da API
        </h2>
        <p className="text-slate-600 text-sm mt-2 leading-relaxed max-w-3xl">
          Conecte os produtos e consultas automatizadas da Renacred diretamente ao seu ERP, CRM ou esteira de crédito via endpoints REST de alta performance.
        </p>

        <div className="mt-6 flex flex-wrap gap-4 text-xs font-mono">
          <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-slate-700">
            <span className="text-slate-500 font-sans">Endereço Base: </span>
            <span className="text-blue-700 font-bold">https://api.renacred.com.br</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-slate-700">
            <span className="text-slate-500 font-sans">Chave no Cabeçalho: </span>
            <span className="text-slate-900 font-bold">x-api-key: rena_live_...</span>
          </div>
        </div>
      </div>

      {/* Seletor de Produto */}
      <div className="flex items-center space-x-3 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveProduct('E1')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeProduct === 'E1'
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-600" />
          <span>PRODUTO E1 • Imóveis (DOI/Cartórios)</span>
        </button>

        <button
          onClick={() => setActiveProduct('E2')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeProduct === 'E2'
              ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Car className="w-4 h-4 text-emerald-600" />
          <span>PRODUTO E2 • Proprietários Veiculares</span>
        </button>
      </div>

      {/* Especificação do Produto Selecionado */}
      {activeProduct === 'E1' ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2.5 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                  PRODUTO E1
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  E1 - Busca de Imóvel por Documento
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Varredura de titularidade, declarações DOI (Receita Federal) e matrículas cartorárias ativas e históricas.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-lg text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                GET
              </span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                POST
              </span>
              <span className="text-xs font-bold text-slate-900 font-mono bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                /v1/imobiliario/historico
              </span>
            </div>
          </div>

          {/* Parâmetros E1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Exemplo de Envio (JSON)</h4>
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 font-mono text-xs text-slate-200">
                <pre>{`{
  "query": "01036115925" // CPF ou CNPJ (apenas números)
}`}</pre>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Exemplo de Resposta (JSON)</h4>
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-48">
                <pre>{`{
  "periodo": "1990 até 2024",
  "total_declaracoes": 1,
  "declaracoes": [
    {
      "numDeclaracao": "10023456",
      "tipoDeclaracao": "Aquisição",
      "matricula": "54210",
      "cartorio": "1º Cartório de Registro de Imóveis",
      "dataLavratura": "2023-08-10",
      "alienantes": [{ "nome": "EMPRESA VENDEDORA LTDA", "cpfCnpj": "..." }],
      "adquirentes": [{ "nome": "PROPRIETÁRIO ATUAL", "cpfCnpj": "..." }]
    }
  ],
  "api_central": {
    "api_utilizada": "historico_imobiliario",
    "query_fornecida": "01036115925",
    "timestamp": "2026-09-21T18:30:00.000Z"
  }
}`}</pre>
              </div>
            </div>
          </div>

          {/* Exemplos de Código E1 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Exemplos de Código (E1)</h4>
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                {(['url_get', 'curl', 'node', 'python', 'php', 'csharp'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      activeLang === lang
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lang === 'url_get' ? 'URL (GET)' : lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <pre className="bg-slate-950 border border-slate-900 rounded-2xl p-5 text-xs text-slate-200 font-mono overflow-x-auto">
                {currentSnippets[activeLang]}
              </pre>
              <button
                onClick={() => copyCode(currentSnippets[activeLang], activeLang)}
                className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center transition border border-slate-700 shadow-xs cursor-pointer"
              >
                {copiedLang === activeLang ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Playground Interativo E1 */}
          <div className="border-t border-slate-100 pt-6 space-y-4">
            <div className="flex items-center space-x-2">
              <Code2 className="w-5 h-5 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-900">Simulador do Produto E1 (Histórico Imobiliário)</h4>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={testDoc}
                onChange={(e) => setTestDoc(e.target.value)}
                placeholder="Digite um CPF ou CNPJ de teste..."
                className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 font-mono"
              />
              <button
                onClick={handleRunPlaygroundE1}
                disabled={testingE1}
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                {testingE1 ? 'Executando...' : 'Executar Teste E1'}
              </button>
            </div>

            {testResponseE1 && (
              <pre className="bg-slate-950 border border-slate-900 rounded-xl p-4 text-xs text-emerald-400 font-mono max-h-96 overflow-y-auto">
                {testResponseE1}
              </pre>
            )}
          </div>
        </div>
      ) : (
        /* PRODUTO E2 */
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2.5 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono bg-emerald-100 text-emerald-900 border border-emerald-300">
                  PRODUTO E2
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  E2 - Histórico de Proprietários por Placa
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Auditoria de cadeia dominial, transferências de titularidade e histórico cronológico completo de proprietários veiculares.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-lg text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                GET
              </span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                POST
              </span>
              <span className="text-xs font-bold text-slate-900 font-mono bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                /v1/veicular/proprietarios
              </span>
            </div>
          </div>

          {/* Parâmetros E2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Exemplo de Envio (JSON)</h4>
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 font-mono text-xs text-slate-200">
                <pre>{`{
  "placa": "ATT0849" // Padrão convencional ou Mercosul (ex: ATT0I49)
}`}</pre>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Exemplo de Resposta (JSON) - Ordem Cronológica</h4>
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-48">
                <pre>{`{
  "success": true,
  "placa": "ATT0I49",
  "renavam": "00281216878",
  "total": 10,
  "proprietario_atual": {
    "nome": "SILVIA MARIA ALESSI DUDA",
    "documento": "101.899.149-20",
    "tipo": "Pessoa fisica",
    "uf": "PR",
    "municipio": "IRATI"
  },
  "historico": [
    {
      "ordem": 1, // Começa pela data mais antiga
      "data": "27/01/2011",
      "nome": "RESTAURANTE E LANCHONETE IPIRANGAO LTDA",
      "documento": "76.112.507/0001-07",
      "municipio": "CASTRO",
      "uf": "PR",
      "atual": false
    },
    ...
    {
      "ordem": 10, // Termina no proprietário vigente
      "data": "15/03/2024",
      "nome": "SILVIA MARIA ALESSI DUDA",
      "documento": "101.899.149-20",
      "municipio": "IRATI",
      "uf": "PR",
      "atual": true
    }
  ]
}`}</pre>
              </div>
            </div>
          </div>

          {/* Exemplos de Código E2 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Exemplos de Código (E2)</h4>
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                {(['url_get', 'curl', 'node', 'python', 'php', 'csharp'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      activeLang === lang
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lang === 'url_get' ? 'URL (GET)' : lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <pre className="bg-slate-950 border border-slate-900 rounded-2xl p-5 text-xs text-slate-200 font-mono overflow-x-auto">
                {currentSnippets[activeLang]}
              </pre>
              <button
                onClick={() => copyCode(currentSnippets[activeLang], activeLang)}
                className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center transition border border-slate-700 shadow-xs cursor-pointer"
              >
                {copiedLang === activeLang ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Playground Interativo E2 */}
          <div className="border-t border-slate-100 pt-6 space-y-4">
            <div className="flex items-center space-x-2">
              <Car className="w-5 h-5 text-emerald-700" />
              <h4 className="text-sm font-bold text-slate-900">Simulador do Produto E2 (Histórico de Proprietários)</h4>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={testPlaca}
                onChange={(e) => setTestPlaca(e.target.value.toUpperCase())}
                placeholder="Digite uma Placa de teste (ex: ATT0849)..."
                className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 font-mono uppercase"
              />
              <button
                onClick={handleRunPlaygroundE2}
                disabled={testingE2}
                className="bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                {testingE2 ? 'Executando...' : 'Executar Teste E2'}
              </button>
            </div>

            {testResponseE2 && (
              <pre className="bg-slate-950 border border-slate-900 rounded-xl p-4 text-xs text-emerald-400 font-mono max-h-96 overflow-y-auto">
                {testResponseE2}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Códigos de Retorno HTTP Globais */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Respostas e Códigos HTTP Padronizados</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
            <span className="font-bold text-emerald-700 font-mono">200 Sucesso</span>
            <p className="text-slate-600 mt-1">Consulta realizada com sucesso. Retorna os registros oficiais encontrados.</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
            <span className="font-bold text-amber-800 font-mono">400 Parâmetro Inválido</span>
            <p className="text-slate-600 mt-1">Documento ou placa informado em formato inválido.</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
            <span className="font-bold text-rose-700 font-mono">401 Não Autorizado</span>
            <p className="text-slate-600 mt-1">Chave de acesso inválida ou ausente no cabeçalho/query param.</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
            <span className="font-bold text-rose-700 font-mono">402 Saldo Insuficiente</span>
            <p className="text-slate-600 mt-1">Saldo esgotado (pré-pago) ou limite mensal atingido (pós-pago).</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
            <span className="font-bold text-amber-800 font-mono">429 Rate Limit</span>
            <p className="text-slate-600 mt-1">Limite operacional de chamadas por minuto excedido.</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
            <span className="font-bold text-slate-700 font-mono">500 Instabilidade</span>
            <p className="text-slate-600 mt-1">Instabilidade temporária no acesso às bases cadastrais.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
