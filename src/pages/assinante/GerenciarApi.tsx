import React, { useState, useEffect } from 'react';
import { KeyRound, Plus, Copy, Trash2, ShieldCheck, Check, Terminal, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import ConfirmModal from '../../components/ui/ConfirmModal';

export default function GerenciarApi() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [allowedIps, setAllowedIps] = useState('');
  const [rateLimit, setRateLimit] = useState('60');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal de Confirmação de Revogação
  const [keyToRevoke, setKeyToRevoke] = useState<any | null>(null);
  const [revoking, setRevoking] = useState(false);

  const [selectedKeyForTest, setSelectedKeyForTest] = useState<string>('');
  const [testDocument, setTestDocument] = useState('01036115925');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [testApiResult, setTestApiResult] = useState<any | null>(null);
  const [testingApi, setTestingApi] = useState(false);

  const fetchKeys = async () => {
    try {
      const res = await api.get('/api/keys');
      if (res.data?.success) {
        setKeys(res.data.data);
        const activeKey = res.data.data.find((k: any) => k.isActive);
        if (activeKey) {
          setSelectedKeyForTest(activeKey.key);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar chaves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ips = allowedIps ? allowedIps.split(',').map(s => s.trim()).filter(Boolean) : [];
      const res = await api.post('/api/keys', {
        name,
        allowedIps: ips,
        rateLimitMin: parseInt(rateLimit, 10),
      });

      if (res.data?.success) {
        toast.success('Chave de API gerada com sucesso!');
        setShowModal(false);
        setName('');
        setAllowedIps('');
        fetchKeys();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao gerar chave.');
    }
  };

  const handleRevoke = (key: any) => {
    setKeyToRevoke(key);
  };

  const executeRevokeKey = async () => {
    if (!keyToRevoke) return;
    setRevoking(true);
    try {
      const res = await api.delete(`/api/keys/${keyToRevoke.id}`);
      if (res.data?.success) {
        toast.success('Chave de API revogada com sucesso.');
        setKeyToRevoke(null);
        fetchKeys();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao revogar chave.');
    } finally {
      setRevoking(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Chave copiada para a área de transferência!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const cleanTestDoc = testDocument.replace(/\D/g, '');
  const apiUrlBase = 'https://api.renacred.com.br/v1/imobiliario/historico';
  const generatedUrl = `${apiUrlBase}?token=${selectedKeyForTest || 'SEU_TOKEN'}&query=${cleanTestDoc || '00000000000'}`;

  const copyGeneratedUrl = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopiedUrl(true);
    toast.success('URL da API copiada com sucesso!');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const executeQuickApiTest = async () => {
    if (!selectedKeyForTest) {
      toast.error('Selecione ou crie uma chave de acesso ativa primeiro.');
      return;
    }
    if (!cleanTestDoc) {
      toast.error('Informe um CPF ou CNPJ válido para teste.');
      return;
    }

    setTestingApi(true);
    setTestApiResult(null);
    try {
      const res = await api.get(`/v1/imobiliario/historico?token=${selectedKeyForTest}&query=${cleanTestDoc}`);
      setTestApiResult(res.data);
      toast.success('Consulta via API executada com sucesso!');
    } catch (err: any) {
      const errData = err.response?.data || { message: err.message };
      setTestApiResult(errData);
      toast.error(errData.message || 'Erro ao executar teste de API.');
    } finally {
      setTestingApi(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs flex flex-wrap items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <KeyRound className="w-6 h-6 mr-2.5 text-emerald-600" />
            Chaves de Acesso
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Gere chaves seguras para integrar as consultas de imóveis diretamente ao seu sistema ou ERP.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/docs"
            className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition shadow-xs"
          >
            <Terminal className="w-4 h-4 mr-1.5 text-emerald-600" />
            Guia de Integração
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Chave de Acesso
          </button>
        </div>
      </div>

      {/* Widget Interativo: Gerador de URL no Padrão Direto GET */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
              Padrão Direto GET / URL Pronta
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-2">
              Gerador de Link de Integração (Igual ao Padrão de Mercado)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Informe o documento e veja a URL completa da Renacred pronta para copiar, abrir no navegador ou testar.
            </p>
          </div>

          {keys.filter(k => k.isActive).length > 1 && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-600 font-semibold">Chave de Teste:</span>
              <select
                value={selectedKeyForTest}
                onChange={(e) => setSelectedKeyForTest(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-slate-800 focus:outline-none focus:border-blue-600"
              >
                {keys.filter(k => k.isActive).map(k => (
                  <option key={k.id} value={k.key}>{k.name} ({k.key.substring(0, 16)}...)</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Seu Token / Chave Ativa</label>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800">
              <span className="truncate">{selectedKeyForTest || 'Nenhuma chave ativa gerada'}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Documento para Consulta (CPF ou CNPJ)</label>
            <input
              type="text"
              value={testDocument}
              onChange={(e) => setTestDocument(e.target.value)}
              placeholder="Digite o CPF ou CNPJ"
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 font-mono"
            />
          </div>

          <div className="flex items-end space-x-2">
            <button
              onClick={executeQuickApiTest}
              disabled={testingApi || !selectedKeyForTest}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition shadow-xs disabled:opacity-50"
            >
              {testingApi ? 'Consultando API...' : 'Testar via API Agora'}
            </button>
            <a
              href={generatedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Abrir URL direta no navegador"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* URL Gerada */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>Link Completo da Requisição (GET):</span>
            <span className="text-[11px] font-normal text-slate-400">Pode ser aberto no navegador ou chamado via cURL / Axios</span>
          </label>
          <div className="flex items-center bg-slate-900 rounded-2xl p-3 border border-slate-800 shadow-inner">
            <code className="text-xs text-emerald-400 font-mono flex-1 overflow-x-auto select-all break-all pr-3">
              {generatedUrl}
            </code>
            <button
              onClick={copyGeneratedUrl}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition shrink-0"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? 'Copiado!' : 'Copiar Link'}</span>
            </button>
          </div>
        </div>

        {/* Visualizador de Retorno do Teste */}
        {testApiResult && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Resposta da API (JSON em Tempo Real):</span>
              <button
                onClick={() => setTestApiResult(null)}
                className="text-[11px] text-slate-400 hover:text-slate-600"
              >
                Limpar Retorno
              </button>
            </div>
            <pre className="bg-slate-950 text-slate-200 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-72 border border-slate-800">
              {JSON.stringify(testApiResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Lista de Chaves */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Carregando chaves...</div>
        ) : keys.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Nenhuma chave de acesso cadastrada. Clique em "Nova Chave de Acesso" acima para criar uma.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/50">
                <tr>
                  <th className="py-3 px-4">Identificação</th>
                  <th className="py-3 px-4">Chave de Acesso</th>
                  <th className="py-3 px-4">Limite por Minuto</th>
                  <th className="py-3 px-4">Consultas Realizadas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">{k.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-800">
                      <div className="flex items-center space-x-2">
                        <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 text-slate-800">
                          {k.key}
                        </span>
                        <button
                          onClick={() => copyToClipboard(k.key, k.id)}
                          className="p-1 hover:text-emerald-600 text-slate-400 transition"
                          title="Copiar chave"
                        >
                          {copiedId === k.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{k.rateLimitMin} consultas/min</td>
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">{k.totalCalls}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          k.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {k.isActive ? 'Ativa' : 'Revogada'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {k.isActive && (
                        <button
                          onClick={() => handleRevoke(k)}
                          className="text-rose-600 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 transition"
                          title="Revogar chave"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Criar Chave */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Nova Chave de Acesso</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateKey} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nome da Integração</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Sistema Imobiliário, ERP, App"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">IPs Permitidos (Opcional, separados por vírgula)</label>
                <input
                  type="text"
                  value={allowedIps}
                  onChange={(e) => setAllowedIps(e.target.value)}
                  placeholder="Ex: 200.150.10.5, 187.20.11.2"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Limite de Taxa (Req / Minuto)</label>
                <input
                  type="number"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-3 rounded-xl text-xs transition shadow-xs"
              >
                Gerar Chave
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Revogação (sem window nativo) */}
      <ConfirmModal
        isOpen={!!keyToRevoke}
        title="Revogar Chave de API"
        description={
          keyToRevoke
            ? `Deseja realmente revogar a chave de API "${keyToRevoke.name}"?\n\nTodas as integrações externas e ERPs associados a esta chave pararão de funcionar imediatamente.`
            : ''
        }
        confirmText="Revogar Chave"
        cancelText="Cancelar"
        variant="danger"
        loading={revoking}
        onConfirm={executeRevokeKey}
        onClose={() => setKeyToRevoke(null)}
      />
    </div>
  );
}
