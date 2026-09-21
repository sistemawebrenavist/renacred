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

  const fetchKeys = async () => {
    try {
      const res = await api.get('/api/keys');
      if (res.data?.success) setKeys(res.data.data);
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs flex flex-wrap items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <KeyRound className="w-6 h-6 mr-2.5 text-emerald-600" />
            Chaves de Integração API
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Gere tokens de autenticação para consumir a API REST de histórico imobiliário no seu próprio sistema ou ERP.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/docs"
            className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition shadow-xs"
          >
            <Terminal className="w-4 h-4 mr-1.5 text-emerald-600" />
            Ver Documentação
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Chave de API
          </button>
        </div>
      </div>

      {/* Lista de Chaves */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Carregando chaves de API...</div>
        ) : keys.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Nenhuma chave de API ativa. Clique em "Nova Chave de API" acima para gerar uma.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/50">
                <tr>
                  <th className="py-3 px-4">Identificação</th>
                  <th className="py-3 px-4">Token / Chave</th>
                  <th className="py-3 px-4">Rate Limit</th>
                  <th className="py-3 px-4">Total Chamadas</th>
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
                    <td className="py-3 px-4 text-slate-600">{k.rateLimitMin} req/min</td>
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
              <h3 className="text-base font-bold text-slate-900">Criar Nova Chave de API</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateKey} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nome da Aplicação</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: ERP Imobiliário Produção"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">IPs Permitidos (Opcional - separador vírgula)</label>
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
