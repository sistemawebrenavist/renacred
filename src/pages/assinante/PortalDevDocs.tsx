import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import api from '../../services/api';
import {
  PRODUCTS_CATALOG,
  ProductDefinition,
  CATEGORIES_CONFIG,
  getProductByCode
} from '../../config/productsCatalog';

export default function PortalDevDocs() {
  const [selectedProductCode, setSelectedProductCode] = useState<string>('E1');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [copiedLang, setCopiedLang] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<'url_get' | 'curl' | 'node' | 'python' | 'php' | 'csharp'>('url_get');

  // Playground Interativo
  const [playgroundInput, setPlaygroundInput] = useState('01036115925');
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundResponse, setPlaygroundResponse] = useState<string | null>(null);

  const activeProduct: ProductDefinition = useMemo(() => {
    return getProductByCode(selectedProductCode) || PRODUCTS_CATALOG[0];
  }, [selectedProductCode]);

  // Produtos filtrados por categoria para o seletor
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'todos') return PRODUCTS_CATALOG;
    return PRODUCTS_CATALOG.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  // Altera o produto ativo e reseta o exemplo do playground
  const handleSelectProduct = (product: ProductDefinition) => {
    setSelectedProductCode(product.code);
    setPlaygroundResponse(null);
    if (product.inputType === 'placa') {
      setPlaygroundInput('ATT0849');
    } else if (product.inputType === 'rg') {
      setPlaygroundInput('123456789');
    } else {
      setPlaygroundInput('01036115925');
    }
  };

  const copyCode = (code: string, lang: string) => {
    navigator.clipboard.writeText(code);
    setCopiedLang(lang);
    toast.success('Código copiado para a área de transferência.');
    setTimeout(() => setCopiedLang(null), 2000);
  };

  // Gerador dinâmico de snippets de código para os 16 produtos
  const codeSnippets = useMemo(() => {
    const code = activeProduct.code.toLowerCase();
    const slug = activeProduct.slug;
    const sampleQuery =
      activeProduct.inputType === 'placa'
        ? 'ATT0849'
        : activeProduct.inputType === 'rg'
        ? '123456789'
        : '01036115925';

    return {
      url_get: `# 1. Requisição Direta via GET (Universal):
https://api.renacred.com.br/v1/${code}?token=SUA_CHAVE_API&query=${sampleQuery}

# 2. Requisição por Slug Semântico:
https://api.renacred.com.br/v1/${slug}?token=SUA_CHAVE_API&query=${sampleQuery}

# 3. Requisição via Query Parameter com Chave no Header:
# GET /v1/${code}?query=${sampleQuery}
# Header: x-api-key: SUA_CHAVE_API_AQUI`,

      curl: `# Chamada GET com token via Query Param:
curl -X GET "https://api.renacred.com.br/v1/${code}?token=SUA_CHAVE_API&query=${sampleQuery}"

# Chamada POST com autenticação via Header (Padrão Corporativo):
curl -X POST "https://api.renacred.com.br/v1/${code}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: SUA_CHAVE_API_AQUI" \\
  -d '{"query": "${sampleQuery}"}'`,

      node: `const axios = require('axios');

async function consultarRenacred() {
  try {
    const response = await axios.post(
      'https://api.renacred.com.br/v1/${code}',
      { query: '${sampleQuery}' },
      {
        headers: {
          'x-api-key': 'SUA_CHAVE_API_AQUI',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Status:', response.status);
    console.log('Dados Oficiais:', response.data);
  } catch (error) {
    console.error('Erro na requisição:', error.response?.data || error.message);
  }
}

consultarRenacred();`,

      python: `import requests

url = "https://api.renacred.com.br/v1/${code}"
headers = {
    "x-api-key": "SUA_CHAVE_API_AQUI",
    "Content-Type": "application/json"
}
payload = {
    "query": "${sampleQuery}"
}

response = requests.post(url, json=payload, headers=headers)
print("Código HTTP:", response.status_code)
print("Resposta Oficial:", response.json())`,

      php: `<?php
$curl = curl_init();

curl_setopt_array($curl, [
  CURLOPT_URL => "https://api.renacred.com.br/v1/${code}",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CUSTOMREQUEST => "POST",
  CURLOPT_POSTFIELDS => json_encode(["query" => "${sampleQuery}"]),
  CURLOPT_HTTPHEADER => [
    "Content-Type: application/json",
    "x-api-key: SUA_CHAVE_API_AQUI"
  ],
]);

$response = curl_exec($curl);
$err = curl_error($curl);
curl_close($curl);

if ($err) {
  echo "Erro cURL: " . $err;
} else {
  echo $response;
}`,

      csharp: `using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

class Program {
    static async Task Main() {
        var client = new HttpClient();
        client.DefaultRequestHeaders.Add("x-api-key", "SUA_CHAVE_API_AQUI");

        var json = "{\\"query\\":\\"${sampleQuery}\\"}";
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.PostAsync("https://api.renacred.com.br/v1/${code}", content);
        var result = await response.Content.ReadAsStringAsync();

        Console.WriteLine($"Status: {response.StatusCode}");
        Console.WriteLine(result);
    }
}`
    };
  }, [activeProduct]);

  // Execução no Playground em Tempo Real
  const handleRunPlayground = async () => {
    if (!playgroundInput.trim()) {
      toast.error('Informe um valor de teste para executar a requisição.');
      return;
    }

    setPlaygroundLoading(true);
    setPlaygroundResponse(null);

    const clean = playgroundInput.replace(/[^a-zA-Z0-9]/g, '');

    try {
      const res = await api.post(`/api/consultas/${activeProduct.code}`, {
        query: clean
      });
      setPlaygroundResponse(JSON.stringify(res.data, null, 2));
      toast.success('Resposta recebida com sucesso das bases oficiais.');
    } catch (err: any) {
      const errData = err.response?.data || { error: err.message };
      setPlaygroundResponse(JSON.stringify(errData, null, 2));
      toast.error('A API retornou uma resposta com erro ou recusa.');
    } finally {
      setPlaygroundLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Cabeçalho Técnico */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                Portal do Desenvolvedor
              </span>
              <span className="text-xs text-slate-400 font-mono">v1.4.0</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Documentação da API REST Oficial
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Integração programática direta com os 16 produtos de inteligência patrimonial, cadastral e veicular da Renacred. Respostas em JSON de alta velocidade com garantia de custo zero para consultas sem registros.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 font-mono text-xs shrink-0">
            <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-700">
              <span className="text-slate-400 font-sans block text-[10px]">Base URL</span>
              <span className="text-blue-700 font-bold">https://api.renacred.com.br</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-700">
              <span className="text-slate-400 font-sans block text-[10px]">Autenticação</span>
              <span className="text-slate-900 font-bold">x-api-key: rena_live_...</span>
            </div>
          </div>
        </div>

        {/* Diretrizes Rápidas de Faturamento */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-semibold text-slate-800 block">Regra de Custo Zero:</span>
            <span className="text-slate-500 text-[11px]">
              Se <code className="text-slate-700 font-mono">total_registros: 0</code>, nenhum centavo é debitado.
            </span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-semibold text-slate-800 block">Fallback & Contingência:</span>
            <span className="text-slate-500 text-[11px]">
              Produtos com contingência alternam automaticamente entre bases em caso de oscilação.
            </span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-semibold text-slate-800 block">Autenticação Dupla:</span>
            <span className="text-slate-500 text-[11px]">
              Suporte a cabeçalho <code className="text-slate-700 font-mono">x-api-key</code> ou query param <code className="text-slate-700 font-mono">?token=</code>.
            </span>
          </div>
        </div>
      </div>

      {/* Navegador dos 16 Produtos Oficiais */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Selecione o Produto para Documentação e Teste
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Clique em um dos 16 produtos para carregar endpoints, snippets de código e playground
            </p>
          </div>

          {/* Filtro de Categoria */}
          <div className="flex flex-wrap items-center gap-1">
            {CATEGORIES_CONFIG.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grade de Seleção de Produtos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
          {filteredProducts.map((p) => {
            const isSelected = p.code === activeProduct.code;
            return (
              <button
                key={p.code}
                onClick={() => handleSelectProduct(p)}
                className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : `${p.badgeColor.bg} ${p.badgeColor.text} ${p.badgeColor.border}`
                    }`}
                  >
                    {p.code}
                  </span>
                  {p.hasContingency && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Contingência ativa" />
                  )}
                </div>
                <div className="mt-2">
                  <p className="text-[11px] font-semibold text-slate-900 truncate">
                    {p.shortName}
                  </p>
                  <p className="text-[9px] font-mono text-slate-400 mt-0.5 uppercase truncate">
                    {p.inputType}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detalhes Técnicos do Produto Selecionado */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold font-mono border ${activeProduct.badgeColor.bg} ${activeProduct.badgeColor.text} ${activeProduct.badgeColor.border}`}
              >
                {activeProduct.code}
              </span>
              <h2 className="text-base font-bold text-slate-900">
                {activeProduct.name}
              </h2>
              <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {activeProduct.categoryLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {activeProduct.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
              GET
            </span>
            <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
              POST
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-800 font-semibold border border-slate-200">
              /v1/{activeProduct.code.toLowerCase()}
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-50 text-slate-500 border border-slate-200 text-[11px]">
              /v1/{activeProduct.slug}
            </span>
          </div>
        </div>

        {/* Tabela de Parâmetros e Resposta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Parâmetros de Entrada
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2">
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="font-mono font-bold text-slate-800">query</span>
                <span className="font-mono text-slate-500">string (obrigatório)</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Tipo esperado: <strong>{activeProduct.inputLabel}</strong> ({activeProduct.inputType}).
              </p>
              <p className="text-[11px] text-slate-500">
                Formatos aceitos: dígitos limpos ou formatados. A Renacred realiza sanitização e validação de dígitos verificadores automaticamente.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Destaques Oficiais Retornados
            </h3>
            <ul className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
              {activeProduct.highlights.map((h, i) => (
                <li key={i} className="text-slate-700 flex items-start space-x-1.5">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Seletor de Linguagens & Snippets */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Exemplo de Código para Integração
            </h3>
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              {(
                [
                  { id: 'url_get', label: 'URL (GET)' },
                  { id: 'curl', label: 'cURL' },
                  { id: 'node', label: 'Node.js' },
                  { id: 'python', label: 'Python' },
                  { id: 'php', label: 'PHP' },
                  { id: 'csharp', label: 'C#' }
                ] as const
              ).map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setActiveLang(lang.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    activeLang === lang.id
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative bg-slate-950 border border-slate-900 rounded-xl p-4 font-mono text-xs text-slate-200 overflow-x-auto">
            <button
              onClick={() => copyCode(codeSnippets[activeLang], activeLang)}
              className="absolute right-3 top-3 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-sans transition"
            >
              {copiedLang === activeLang ? 'Copiado' : 'Copiar'}
            </button>
            <pre className="pt-2 leading-relaxed">{codeSnippets[activeLang]}</pre>
          </div>
        </div>

        {/* Playground Interativo */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Playground Interativo • Teste ao Vivo ({activeProduct.code})
            </h3>
            <span className="text-[11px] text-slate-400">
              Executa requisição real autenticada por sua conta
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={playgroundInput}
              onChange={(e) => setPlaygroundInput(e.target.value)}
              placeholder={activeProduct.placeholder}
              className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600 transition"
            />
            <button
              onClick={handleRunPlayground}
              disabled={playgroundLoading}
              className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg transition shrink-0"
            >
              {playgroundLoading ? 'Consultando...' : 'Testar Requisição'}
            </button>
          </div>

          {playgroundResponse && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>Resposta JSON das Bases Oficiais:</span>
                <button
                  onClick={() => copyCode(playgroundResponse, 'json_response')}
                  className="hover:text-slate-800 underline font-mono text-[10px]"
                >
                  Copiar JSON
                </button>
              </div>
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-80">
                <pre>{playgroundResponse}</pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Matriz Completa dos 16 Endpoints Oficiais */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Matriz Completa de Endpoints REST (E1 a E16)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Todos os endpoints respondem tanto via GET quanto POST no caminho <code className="font-mono text-slate-700">/v1/:codigo</code>
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-2">Cód.</th>
                <th className="pb-2">Nome do Produto</th>
                <th className="pb-2">Categoria</th>
                <th className="pb-2">Entrada</th>
                <th className="pb-2">Endpoint v1</th>
                <th className="pb-2 text-center">Contingência</th>
                <th className="pb-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PRODUCTS_CATALOG.map((p) => (
                <tr key={p.code} className="hover:bg-slate-50/70 transition">
                  <td className="py-2.5 font-mono font-bold text-slate-900">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] border ${p.badgeColor.bg} ${p.badgeColor.text} ${p.badgeColor.border}`}
                    >
                      {p.code}
                    </span>
                  </td>
                  <td className="py-2.5 font-medium text-slate-800">
                    {p.name}
                  </td>
                  <td className="py-2.5 text-slate-500">
                    {p.categoryLabel}
                  </td>
                  <td className="py-2.5 font-mono text-[11px] text-slate-600 uppercase">
                    {p.inputType}
                  </td>
                  <td className="py-2.5 font-mono text-blue-700 text-[11px]">
                    /v1/{p.code.toLowerCase()}
                  </td>
                  <td className="py-2.5 text-center">
                    {p.hasContingency ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Ativa
                      </span>
                    ) : (
                      <span className="text-slate-300 text-[10px]">—</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => {
                        handleSelectProduct(p);
                        window.scrollTo({ top: 350, behavior: 'smooth' });
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
