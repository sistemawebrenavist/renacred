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
  Code2
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';

export default function PortalDevDocs() {
  const [copiedLang, setCopiedLang] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<'curl' | 'node' | 'python' | 'php' | 'csharp'>('curl');

  // Playground
  const [testDoc, setTestDoc] = useState('01036115925');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const copyCode = (code: string, lang: string) => {
    navigator.clipboard.writeText(code);
    setCopiedLang(lang);
    toast.success('Código copiado para a área de transferência!');
    setTimeout(() => setCopiedLang(null), 2000);
  };

  const codeSnippets = {
    curl: `curl -X POST "https://api.renacred.com.br/v1/imobiliario/historico" \\
  -H "x-api-key: SUA_CHAVE_API_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "01036115925"}'`,

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

  const handleRunPlayground = async () => {
    if (!testDoc.trim()) return;
    setTesting(true);
    setTestResponse(null);
    try {
      const res = await api.post('/api/imobiliario/consultar', { documento: testDoc });
      setTestResponse(JSON.stringify(res.data, null, 2));
    } catch (err: any) {
      setTestResponse(JSON.stringify(err.response?.data || { error: err.message }, null, 2));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Topo / Introdução */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs">
        <div className="flex items-center space-x-2 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Documentação Oficial de Integração API</span>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          API REST de Histórico Imobiliário e DOI
        </h2>
        <p className="text-slate-600 text-sm mt-2 leading-relaxed max-w-3xl">
          Integre sua plataforma diretamente aos serviços da Renacred. Todas as consultas retornam dados estruturados das serventias notariais e declarações de operações imobiliárias em tempo real.
        </p>

        <div className="mt-6 flex flex-wrap gap-4 text-xs font-mono">
          <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-slate-700">
            <span className="text-slate-500">Base URL: </span>
            <span className="text-blue-700 font-bold">https://api.renacred.com.br</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-slate-700">
            <span className="text-slate-500">Header Obrigatório: </span>
            <span className="text-slate-900 font-bold">x-api-key: rena_live_...</span>
          </div>
        </div>
      </div>

      {/* Especificação do Endpoint */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
              POST
            </span>
            <span className="text-sm font-bold text-slate-900 font-mono">
              /v1/imobiliario/historico
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium">Tarifado por consulta realizada</span>
        </div>

        {/* Parâmetros do Body */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Corpo da Requisição (JSON)</h4>
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 font-mono text-xs text-slate-200">
            <pre>{`{
  "query": "01036115925" // CPF (11 dígitos) ou CNPJ (14 dígitos)
}`}</pre>
          </div>
        </div>

        {/* Exemplos de Código */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Exemplos de Código</h4>
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              {(['curl', 'node', 'python', 'php', 'csharp'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    activeLang === lang
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <pre className="bg-slate-950 border border-slate-900 rounded-2xl p-5 text-xs text-slate-200 font-mono overflow-x-auto">
              {codeSnippets[activeLang]}
            </pre>
            <button
              onClick={() => copyCode(codeSnippets[activeLang], activeLang)}
              className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center transition border border-slate-700 shadow-xs"
            >
              {copiedLang === activeLang ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  Copiar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Códigos de Retorno HTTP */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Códigos de Status HTTP</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <span className="font-bold text-emerald-700 font-mono">200 OK</span>
              <p className="text-slate-600 mt-1">Consulta executada com sucesso. Retorna array com declarações DOI.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <span className="font-bold text-amber-800 font-mono">400 Bad Request</span>
              <p className="text-slate-600 mt-1">CPF ou CNPJ inválido ou parâmetro ausente.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <span className="font-bold text-rose-700 font-mono">401 Unauthorized</span>
              <p className="text-slate-600 mt-1">Chave x-api-key inválida, inativa ou ausente no cabeçalho.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <span className="font-bold text-rose-700 font-mono">402 Payment Required</span>
              <p className="text-slate-600 mt-1">Saldo insuficiente (pré-pago) ou limite de crédito atingido (pós-pago).</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <span className="font-bold text-amber-800 font-mono">429 Rate Limit</span>
              <p className="text-slate-600 mt-1">Limite de requisições por minuto excedido para esta chave de API.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <span className="font-bold text-slate-700 font-mono">500 Server Error</span>
              <p className="text-slate-600 mt-1">Instabilidade temporária nos cartórios de origem.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Playground Interativo */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-2">
          <Code2 className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-bold text-slate-900">Playground Interativo de Testes</h3>
        </div>
        <p className="text-xs text-slate-500">
          Execute uma requisição de homologação em tempo real para inspecionar a carga útil JSON retornada pela API.
        </p>

        <div className="flex gap-3">
          <input
            type="text"
            value={testDoc}
            onChange={(e) => setTestDoc(e.target.value)}
            placeholder="Digite um CPF ou CNPJ de teste..."
            className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 font-mono"
          />
          <button
            onClick={handleRunPlayground}
            disabled={testing}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center transition shadow-xs disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            {testing ? 'Executando...' : 'Executar Teste'}
          </button>
        </div>

        {testResponse && (
          <pre className="bg-slate-950 border border-slate-900 rounded-xl p-4 text-xs text-emerald-400 font-mono max-h-96 overflow-y-auto">
            {testResponse}
          </pre>
        )}
      </div>
    </div>
  );
}
