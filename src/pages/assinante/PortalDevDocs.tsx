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
      <div className="bg-[#0b1325] border border-slate-800/80 rounded-3xl p-8 shadow-xl">
        <div className="flex items-center space-x-3 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
          <ShieldCheck className="w-4 h-4" />
          <span>Documentação Oficial de Integração API</span>
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          API REST de Histórico Imobiliário & DOI
        </h2>
        <p className="text-slate-300 text-sm mt-2 leading-relaxed max-w-3xl">
          Integre sua plataforma diretamente à infraestrutura da Renacred. Todas as consultas retornam dados estruturados das serventias notariais e declarações de operações imobiliárias em tempo real.
        </p>

        <div className="mt-6 flex flex-wrap gap-4 text-xs font-mono">
          <div className="bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-slate-300">
            <span className="text-slate-500">Base URL: </span>
            <span className="text-blue-400 font-bold">https://api.renacred.com.br</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-slate-300">
            <span className="text-slate-500">Header Obrigatório: </span>
            <span className="text-slate-200 font-bold">x-api-key: rena_live_...</span>
          </div>
        </div>
      </div>

      {/* Especificação do Endpoint */}
      <div className="bg-[#0b1325] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">
              POST
            </span>
            <span className="text-sm font-bold text-white font-mono">
              /v1/imobiliario/historico
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium">Tarifado por consulta realizada</span>
        </div>

        {/* Parâmetros do Body */}
        <div>
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Corpo da Requisição (JSON)</h4>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200">
            <pre>{`{
  "query": "01036115925" // CPF (11 dígitos) ou CNPJ (14 dígitos)
}`}</pre>
          </div>
        </div>

        {/* Exemplos de Código */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Exemplos de Código</h4>
            <div className="flex space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              {(['curl', 'node', 'python', 'php', 'csharp'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    activeLang === lang
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <pre className="bg-[#070d18] border border-slate-800 rounded-2xl p-5 text-xs text-slate-200 font-mono overflow-x-auto">
              {codeSnippets[activeLang]}
            </pre>
            <button
              onClick={() => copyCode(codeSnippets[activeLang], activeLang)}
              className="absolute top-4 right-4 bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center transition border border-slate-700"
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
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Códigos de Status HTTP</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="font-bold text-emerald-400 font-mono">200 OK</span>
              <p className="text-slate-400 mt-1">Consulta executada com sucesso. Retorna array com declarações DOI.</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="font-bold text-amber-400 font-mono">400 Bad Request</span>
              <p className="text-slate-400 mt-1">CPF ou CNPJ inválido ou parâmetro ausente.</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="font-bold text-rose-400 font-mono">401 Unauthorized</span>
              <p className="text-slate-400 mt-1">Chave x-api-key inválida, inativa ou ausente no cabeçalho.</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="font-bold text-rose-400 font-mono">402 Payment Required</span>
              <p className="text-slate-400 mt-1">Saldo insuficiente (pré-pago) ou limite de crédito atingido (pós-pago).</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="font-bold text-amber-400 font-mono">429 Rate Limit</span>
              <p className="text-slate-400 mt-1">Limite de requisições por minuto excedido para esta chave de API.</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="font-bold text-slate-400 font-mono">500 Server Error</span>
              <p className="text-slate-400 mt-1">Instabilidade temporária nos cartórios de origem.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Playground Interativo */}
      <div className="bg-[#0b1325] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2">
          <Code2 className="w-5 h-5 text-blue-500" />
          <h3 className="text-base font-bold text-white">Playground Interativo de Testes</h3>
        </div>
        <p className="text-xs text-slate-400">
          Execute uma requisição de homologação em tempo real para inspecionar a carga útil JSON retornada pela API.
        </p>

        <div className="flex gap-3">
          <input
            type="text"
            value={testDoc}
            onChange={(e) => setTestDoc(e.target.value)}
            placeholder="Digite um CPF ou CNPJ de teste..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
          />
          <button
            onClick={handleRunPlayground}
            disabled={testing}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center transition shadow-sm disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            {testing ? 'Executando...' : 'Executar Teste'}
          </button>
        </div>

        {testResponse && (
          <pre className="bg-[#070d18] border border-slate-800 rounded-xl p-4 text-xs text-slate-300 font-mono max-h-96 overflow-y-auto">
            {testResponse}
          </pre>
        )}
      </div>
    </div>
  );
}
