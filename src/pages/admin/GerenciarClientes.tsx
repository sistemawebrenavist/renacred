import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Edit3, 
  Wallet, 
  Calendar, 
  Check, 
  X, 
  PlusCircle, 
  SlidersHorizontal 
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';

export default function GerenciarClientes() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal de Edição de Parâmetros
  const [editingCompany, setEditingCompany] = useState<any | null>(null);
  const [accountType, setAccountType] = useState<'PRE_PAID' | 'POST_PAID'>('PRE_PAID');
  const [billingDueDate, setBillingDueDate] = useState<number>(10);
  const [customQueryPrice, setCustomQueryPrice] = useState<string>('');
  const [creditLimit, setCreditLimit] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  // Modal de Ajuste de Saldo Manual
  const [creditModalCompany, setCreditModalCompany] = useState<any | null>(null);
  const [manualAmount, setManualAmount] = useState<string>('');
  const [manualDescription, setManualDescription] = useState<string>('');
  const [adjusting, setAdjusting] = useState(false);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/companies?search=${encodeURIComponent(search)}`);
      if (res.data?.success) setCompanies(res.data.data);
    } catch (err) {
      console.error('Erro ao buscar empresas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [search]);

  const openEditModal = (c: any) => {
    setEditingCompany(c);
    setAccountType(c.accountType);
    setBillingDueDate(c.billingDueDate || 10);
    setCustomQueryPrice(c.customQueryPrice !== null ? String(c.customQueryPrice) : '');
    setCreditLimit(c.creditLimit !== null ? String(c.creditLimit) : '');
    setIsActive(c.isActive);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;

    setSaving(true);
    try {
      const res = await api.put(`/api/admin/companies/${editingCompany.id}`, {
        accountType,
        billingDueDate,
        customQueryPrice: customQueryPrice ? parseFloat(customQueryPrice) : null,
        creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
        isActive,
      });

      if (res.data?.success) {
        toast.success('Parâmetros comerciais atualizados com sucesso!');
        setEditingCompany(null);
        fetchCompanies();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao atualizar parâmetros.');
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditModalCompany) return;

    setAdjusting(true);
    try {
      const res = await api.post(`/api/admin/companies/${creditModalCompany.id}/credits`, {
        amount: parseFloat(manualAmount),
        description: manualDescription,
      });

      if (res.data?.success) {
        toast.success(res.data.message);
        setCreditModalCompany(null);
        setManualAmount('');
        setManualDescription('');
        fetchCompanies();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao ajustar saldo.');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="bg-[#0b1325] border border-slate-800/80 rounded-3xl p-8 shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center">
            <Users className="w-6 h-6 mr-2.5 text-emerald-400" />
            Gestão de Assinantes & Clientes
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Defina planos Pré-pago/Pós-pago, datas de vencimento, preços personalizados da consulta e limites de crédito.
          </p>
        </div>

        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por razão social, CNPJ ou e-mail..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
          />
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-[#0b1325] border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Carregando lista de clientes...</div>
        ) : companies.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">Nenhum cliente encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="py-3 px-4">Empresa / CNPJ</th>
                  <th className="py-3 px-4">Modalidade</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Tarifa Consulta</th>
                  <th className="py-3 px-4">Saldo / Limite</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {companies.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-white">{c.razaoSocial}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{c.cnpjCpf}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                          c.accountType === 'POST_PAID'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {c.accountType === 'POST_PAID' ? 'Pós-pago' : 'Pré-pago'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-300">
                      Dia {c.billingDueDate || 10}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {c.customQueryPrice ? `R$ ${Number(c.customQueryPrice).toFixed(2)}` : 'Padrão (R$ 5.00)'}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {c.accountType === 'PRE_PAID' ? (
                        <span className="text-emerald-400 font-bold">R$ {Number(c.creditsBalance).toFixed(2)}</span>
                      ) : (
                        <span className="text-sky-400 font-bold">Limite: R$ {Number(c.creditLimit).toFixed(2)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.isActive
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {c.isActive ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(c)}
                        title="Configurar Parâmetros Comerciais"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setCreditModalCompany(c)}
                        title="Ajuste Manual de Saldo"
                        className="p-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Configuração Comercial */}
      {editingCompany && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b1325] border border-slate-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Parâmetros Comerciais do Cliente</h3>
                <p className="text-xs text-slate-400">{editingCompany.razaoSocial}</p>
              </div>
              <button onClick={() => setEditingCompany(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              {/* Modalidade */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Modalidade de Cobrança</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccountType('PRE_PAID')}
                    className={`py-2.5 rounded-xl border font-bold transition ${
                      accountType === 'PRE_PAID'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Pré-pago (Créditos)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('POST_PAID')}
                    className={`py-2.5 rounded-xl border font-bold transition ${
                      accountType === 'POST_PAID'
                        ? 'bg-sky-500/10 border-sky-500 text-sky-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Pós-pago (Fatura)
                  </button>
                </div>
              </div>

              {/* Dia de Vencimento */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Dia de Vencimento da Fatura / Ciclo (1 a 31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={billingDueDate}
                  onChange={(e) => setBillingDueDate(parseInt(e.target.value, 10))}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Preço Customizado da Consulta */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Preço Customizado por Consulta (R$) - Deixe vazio para preço padrão (R$ 5,00)
                </label>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  value={customQueryPrice}
                  onChange={(e) => setCustomQueryPrice(e.target.value)}
                  placeholder="Ex: 4.50"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Limite de Crédito (para Pós-pago) */}
              {accountType === 'POST_PAID' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Limite Máximo de Consumo Pós-pago (R$)</label>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="Ex: 2000.00"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              )}

              {/* Ativo / Bloqueado */}
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-slate-300 font-semibold cursor-pointer">
                  Empresa Ativa e Liberada para Consultas
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-xs transition shadow-sm disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Ajuste Manual de Saldo */}
      {creditModalCompany && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b1325] border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Ajuste Manual de Saldo</h3>
                <p className="text-slate-400">{creditModalCompany.razaoSocial}</p>
              </div>
              <button onClick={() => setCreditModalCompany(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-slate-300">
              Saldo Atual: <span className="font-bold text-emerald-400 font-mono">R$ {Number(creditModalCompany.creditsBalance).toFixed(2)}</span>
            </p>

            <form onSubmit={handleAdjustCredits} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Valor a Ajustar (R$) - Use positivo para adicionar ou negativo para subtrair
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  placeholder="Ex: 50.00 ou -20.00"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Justificativa / Descrição</label>
                <input
                  type="text"
                  required
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="Ex: Bonificação promocional de recarga"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={adjusting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-xs transition shadow-sm disabled:opacity-50"
              >
                {adjusting ? 'Processando...' : 'Confirmar Ajuste de Saldo'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
