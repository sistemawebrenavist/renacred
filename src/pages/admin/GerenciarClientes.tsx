import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Wallet, 
  Calendar, 
  Check, 
  X, 
  Plus, 
  Trash2,
  SlidersHorizontal,
  KeyRound,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import ConfirmModal from '../../components/ui/ConfirmModal';

export default function GerenciarClientes() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal de Gestão de Chaves de API do Cliente (Admin)
  const [apiKeyModalCompany, setApiKeyModalCompany] = useState<any | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Modal de Exclusão de Assinante (Delete)
  const [companyToDelete, setCompanyToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal de Criação de Novo Assinante (Create)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCompany, setNewCompany] = useState({
    cnpjCpf: '',
    razaoSocial: '',
    nomeFantasia: '',
    email: '',
    telefone: '',
    accountType: 'PRE_PAID' as 'PRE_PAID' | 'POST_PAID',
    billingDueDate: 10,
    customQueryPrice: '',
    creditLimit: '',
    initialBalance: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  // Modal de Edição de Parâmetros (Update)
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

  // Handler para criar novo assinante
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.cnpjCpf || !newCompany.razaoSocial || !newCompany.email) {
      toast.error('Preencha os campos obrigatórios da empresa.');
      return;
    }
    if (!newCompany.adminEmail || !newCompany.adminPassword) {
      toast.error('Preencha o e-mail e a senha do administrador da empresa.');
      return;
    }

    setCreating(true);
    try {
      const res = await api.post('/api/admin/companies', newCompany);
      if (res.data?.success) {
        toast.success('Cliente cadastrado com sucesso!');
        setShowCreateModal(false);
        setNewCompany({
          cnpjCpf: '',
          razaoSocial: '',
          nomeFantasia: '',
          email: '',
          telefone: '',
          accountType: 'PRE_PAID',
          billingDueDate: 10,
          customQueryPrice: '',
          creditLimit: '',
          initialBalance: '',
          adminName: '',
          adminEmail: '',
          adminPassword: '',
        });
        fetchCompanies();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao cadastrar cliente.');
    } finally {
      setCreating(false);
    }
  };

  // Handler para solicitar exclusão do assinante
  const handleDeleteCompany = (c: any) => {
    setCompanyToDelete(c);
  };

  const executeDeleteCompany = async () => {
    if (!companyToDelete) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/api/admin/companies/${companyToDelete.id}`);
      if (res.data?.success) {
        toast.success(res.data.message || 'Assinante removido com sucesso.');
        setCompanyToDelete(null);
        fetchCompanies();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao remover assinante.');
    } finally {
      setDeleting(false);
    }
  };

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

  const handleGenerateKeyForCompany = async () => {
    if (!apiKeyModalCompany) return;
    setGeneratingKey(true);
    try {
      const res = await api.post(`/api/admin/companies/${apiKeyModalCompany.id}/keys`, {
        name: `Chave ${apiKeyModalCompany.razaoSocial}`,
      });
      if (res.data?.success) {
        toast.success('Chave de API gerada com sucesso!');
        const newKey = res.data.data;
        setApiKeyModalCompany((prev: any) => ({
          ...prev,
          apiKeys: [newKey, ...(prev?.apiKeys || [])],
        }));
        fetchCompanies();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao gerar chave.');
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleRevokeKeyForCompany = async (keyId: string) => {
    try {
      const res = await api.delete(`/api/admin/companies/keys/${keyId}`);
      if (res.data?.success) {
        toast.success('Chave de API desativada com sucesso.');
        setApiKeyModalCompany((prev: any) => ({
          ...prev,
          apiKeys: prev?.apiKeys?.map((k: any) => (k.id === keyId ? { ...k, isActive: false } : k)),
        }));
        fetchCompanies();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao desativar chave.');
    }
  };

  const copyKeyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    toast.success('Chave copiada para a área de transferência!');
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs flex flex-wrap items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <Users className="w-6 h-6 mr-2.5 text-blue-600" />
            Clientes Cadastrados
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Gerencie acessos, planos de pagamento e limites de cada empresa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="w-full sm:w-64 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar razão social, CNPJ..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 font-sans"
            />
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-xs inline-flex items-center"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Carregando lista de clientes...</div>
        ) : companies.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Nenhum cliente cadastrado. Clique em "Novo Cliente" para criar um.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/50">
                <tr>
                  <th className="py-3 px-4">Empresa / Documento</th>
                  <th className="py-3 px-4">Plano</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Valor por Consulta</th>
                  <th className="py-3 px-4">Saldo ou Limite</th>
                  <th className="py-3 px-4">Acesso API</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-bold text-slate-900">{c.razaoSocial}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{c.cnpjCpf}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.accountType === 'POST_PAID'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {c.accountType === 'POST_PAID' ? 'Pós-pago' : 'Pré-pago'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      Dia {c.billingDueDate || 10}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                      {c.customQueryPrice ? `R$ ${Number(c.customQueryPrice).toFixed(2)}` : 'Padrão (R$ 5,00)'}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {c.accountType === 'PRE_PAID' ? (
                        <span className="text-emerald-700 font-bold">R$ {Number(c.creditsBalance).toFixed(2)}</span>
                      ) : (
                        <span className="text-blue-700 font-bold">Limite: R$ {Number(c.creditLimit).toFixed(2)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {c.apiKeys && c.apiKeys.filter((k: any) => k.isActive).length > 0 ? (
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setApiKeyModalCompany(c)}
                            className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center transition cursor-pointer"
                            title="Ver todas as chaves deste cliente"
                          >
                            <KeyRound className="w-3 h-3 mr-1 text-purple-600" />
                            <span>{c.apiKeys.find((k: any) => k.isActive)?.key.substring(0, 15)}...</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => copyKeyToClipboard(c.apiKeys.find((k: any) => k.isActive)?.key, c.id)}
                            className="p-1 hover:text-purple-700 text-slate-400 transition cursor-pointer"
                            title="Copiar Chave Ativa"
                          >
                            {copiedKeyId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setApiKeyModalCompany(c)}
                          className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3 mr-0.5" /> Gerar Chave
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {c.isActive ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setApiKeyModalCompany(c)}
                          title="Chaves de API"
                          className="w-8 h-8 flex items-center justify-center bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl transition cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(c)}
                          title="Configurar Plano"
                          className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreditModalCompany(c)}
                          title="Ajustar Saldo"
                          className="w-8 h-8 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition cursor-pointer"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCompany(c)}
                          title="Excluir Cliente"
                          className="w-8 h-8 flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastro de Novo Cliente (Create) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-2xl w-full shadow-xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Cadastrar Novo Cliente</h3>
                <p className="text-xs text-slate-500">Cadastre os dados da empresa e crie o usuário de acesso inicial</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-6 text-xs">
              {/* Seção 1: Dados da Empresa */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider">1. Dados da Empresa</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">CNPJ ou CPF *</label>
                    <input
                      type="text"
                      required
                      placeholder="00.000.000/0000-00"
                      value={newCompany.cnpjCpf}
                      onChange={(e) => setNewCompany({ ...newCompany, cnpjCpf: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Razão Social / Nome *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nome Empresarial Ltda"
                      value={newCompany.razaoSocial}
                      onChange={(e) => setNewCompany({ ...newCompany, razaoSocial: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Nome Fantasia</label>
                    <input
                      type="text"
                      placeholder="Marca ou Fantasia"
                      value={newCompany.nomeFantasia}
                      onChange={(e) => setNewCompany({ ...newCompany, nomeFantasia: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">E-mail Corporativo *</label>
                    <input
                      type="email"
                      required
                      placeholder="contato@empresa.com.br"
                      value={newCompany.email}
                      onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="(11) 99999-9999"
                      value={newCompany.telefone}
                      onChange={(e) => setNewCompany({ ...newCompany, telefone: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Parâmetros Comerciais */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider">2. Parâmetros Comerciais</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Modalidade</label>
                    <select
                      value={newCompany.accountType}
                      onChange={(e) => setNewCompany({ ...newCompany, accountType: e.target.value as any })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
                    >
                      <option value="PRE_PAID">Pré-pago (Créditos)</option>
                      <option value="POST_PAID">Pós-pago (Fatura Mensal)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Dia de Vencimento</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={newCompany.billingDueDate}
                      onChange={(e) => setNewCompany({ ...newCompany, billingDueDate: parseInt(e.target.value, 10) || 10 })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 font-mono"
                    />
                  </div>

                  {newCompany.accountType === 'PRE_PAID' ? (
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Saldo Inicial Bonificado (R$)</label>
                      <input
                        type="number"
                        step="10"
                        min="0"
                        placeholder="Ex: 50.00"
                        value={newCompany.initialBalance}
                        onChange={(e) => setNewCompany({ ...newCompany, initialBalance: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 font-mono"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Limite de Crédito Pós-pago (R$)</label>
                      <input
                        type="number"
                        step="100"
                        min="0"
                        placeholder="Ex: 2000.00"
                        value={newCompany.creditLimit}
                        onChange={(e) => setNewCompany({ ...newCompany, creditLimit: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 font-mono"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Tarifa Customizada (R$) (Opcional)</label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      placeholder="Deixe vazio para padrão (R$ 5,00)"
                      value={newCompany.customQueryPrice}
                      onChange={(e) => setNewCompany({ ...newCompany, customQueryPrice: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Administrador de Acesso Inicial */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider">3. Acesso do Administrador</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Nome do Administrador</label>
                    <input
                      type="text"
                      placeholder="Ex: João da Silva"
                      value={newCompany.adminName}
                      onChange={(e) => setNewCompany({ ...newCompany, adminName: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">E-mail de Login *</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@empresa.com.br"
                      value={newCompany.adminEmail}
                      onChange={(e) => setNewCompany({ ...newCompany, adminEmail: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">Senha Inicial de Acesso *</label>
                    <input
                      type="password"
                      required
                      placeholder="Defina uma senha segura"
                      value={newCompany.adminPassword}
                      onChange={(e) => setNewCompany({ ...newCompany, adminPassword: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 rounded-xl text-xs transition shadow-xs disabled:opacity-50"
                >
                  {creating ? 'Salvando...' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Configuração do Plano (Update) */}
      {editingCompany && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-lg w-full shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Configuração do Plano</h3>
                <p className="text-xs text-slate-500">{editingCompany.razaoSocial}</p>
              </div>
              <button onClick={() => setEditingCompany(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              {/* Modalidade */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Plano de Pagamento</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccountType('PRE_PAID')}
                    className={`py-2.5 rounded-xl border font-bold transition ${
                      accountType === 'PRE_PAID'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Pré-pago (Recarga)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('POST_PAID')}
                    className={`py-2.5 rounded-xl border font-bold transition ${
                      accountType === 'POST_PAID'
                        ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Pós-pago (Fatura Mensal)
                  </button>
                </div>
              </div>

              {/* Dia de Vencimento */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Dia de Vencimento da Fatura (1 a 31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={billingDueDate}
                  onChange={(e) => setBillingDueDate(parseInt(e.target.value, 10))}
                  required
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 font-mono"
                />
              </div>

              {/* Preço Customizado da Consulta */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Valor Customizado por Consulta (R$) - Opcional
                </label>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  value={customQueryPrice}
                  onChange={(e) => setCustomQueryPrice(e.target.value)}
                  placeholder="Ex: 4.50"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 font-mono"
                />
              </div>

              {/* Limite de Crédito (para Pós-pago) */}
              {accountType === 'POST_PAID' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Limite Máximo de Consumo Pós-pago (R$)</label>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="Ex: 2000.00"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 font-mono"
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
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-slate-700 font-semibold cursor-pointer">
                  Empresa Ativa e Liberada para Consultas
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 rounded-xl text-xs transition shadow-xs disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Ajuste de Saldo */}
      {creditModalCompany && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Ajustar Saldo do Cliente</h3>
                <p className="text-slate-500">{creditModalCompany.razaoSocial}</p>
              </div>
              <button onClick={() => setCreditModalCompany(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <p className="text-slate-600">
              Saldo Atual: <span className="font-bold text-emerald-700 font-mono">R$ {Number(creditModalCompany.creditsBalance).toFixed(2)}</span>
            </p>

            <form onSubmit={handleAdjustCredits} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Valor (R$) • Positivo para adicionar, negativo para retirar
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  placeholder="Ex: 50.00 ou -20.00"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Motivo ou Observação</label>
                <input
                  type="text"
                  required
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="Ex: Bonificação ou recarga manual"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
                />
              </div>

              <button
                type="submit"
                disabled={adjusting}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 rounded-xl text-xs transition shadow-xs disabled:opacity-50"
              >
                {adjusting ? 'Processando...' : 'Confirmar Saldo'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gestão de Chaves de API do Cliente */}
      {apiKeyModalCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setApiKeyModalCompany(null)} />
          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 z-10 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Chaves de API</h3>
                  <p className="text-xs text-slate-500">{apiKeyModalCompany.razaoSocial}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApiKeyModalCompany(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Chaves Cadastradas ({apiKeyModalCompany.apiKeys?.length || 0})
                </span>
                <button
                  type="button"
                  onClick={handleGenerateKeyForCompany}
                  disabled={generatingKey}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition shadow-xs flex items-center disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {generatingKey ? 'Gerando...' : 'Nova Chave'}
                </button>
              </div>

              {!apiKeyModalCompany.apiKeys || apiKeyModalCompany.apiKeys.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
                  Nenhuma chave de API gerada para este cliente ainda. Clique em "Nova Chave" acima para criar uma.
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeyModalCompany.apiKeys.map((k: any) => (
                    <div key={k.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{k.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            k.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {k.isActive ? 'Ativa' : 'Revogada'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          readOnly
                          value={k.key}
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono text-[11px] text-slate-800 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => copyKeyToClipboard(k.key, k.id)}
                          className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition cursor-pointer"
                          title="Copiar Chave"
                        >
                          {copiedKeyId === k.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Chamadas: <strong className="text-slate-900 font-mono">{k.totalCalls || 0}</strong></span>
                        {k.isActive && (
                          <button
                            type="button"
                            onClick={() => handleRevokeKeyForCompany(k.id)}
                            className="text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                          >
                            Desativar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setApiKeyModalCompany(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão (sem window nativo) */}
      <ConfirmModal
        isOpen={!!companyToDelete}
        title="Excluir Cliente"
        description={
          companyToDelete
            ? `Deseja realmente remover o cliente "${companyToDelete.razaoSocial}" (${companyToDelete.cnpjCpf})?\n\nEsta ação é irreversível e excluirá todos os dados, usuários e consultas vinculados.`
            : ''
        }
        confirmText="Excluir Cliente"
        cancelText="Cancelar"
        variant="danger"
        loading={deleting}
        onConfirm={executeDeleteCompany}
        onClose={() => setCompanyToDelete(null)}
      />
    </div>
  );
}
