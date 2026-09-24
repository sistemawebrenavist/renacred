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
  Copy,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { PRODUCTS_CATALOG } from '../../config/productsCatalog';

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
  const [createdCompanyDetails, setCreatedCompanyDetails] = useState<any | null>(null);
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

  // Gestão Comercial de Produtos & Preços Unitários por Assinante (16 Produtos)
  const [modalTab, setModalTab] = useState<'products' | 'billing'>('products');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productPrices, setProductPrices] = useState<Record<string, string>>({});
  const [productSearch, setProductSearch] = useState('');

  // Modal de Ajuste de Saldo Manual
  const [creditModalCompany, setCreditModalCompany] = useState<any | null>(null);
  const [manualAmount, setManualAmount] = useState<string>('');
  const [manualDescription, setManualDescription] = useState<string>('');
  const [adjusting, setAdjusting] = useState(false);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
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
        setCreatedCompanyDetails({
          ...res.data.data,
          adminEmail: newCompany.adminEmail,
          adminPassword: newCompany.adminPassword,
        });
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
    setModalTab('products');
    setProductSearch('');

    // Resolver produtos autorizados
    const allowed = Array.isArray(c.allowedProducts) && c.allowedProducts.length > 0
      ? (c.allowedProducts.includes('ALL') ? PRODUCTS_CATALOG.map((p) => p.code) : c.allowedProducts)
      : PRODUCTS_CATALOG.map((p) => p.code);
    setSelectedProducts(allowed);

    // Resolver preços customizados por produto
    const initialPrices: Record<string, string> = {};
    if (c.customPrices && typeof c.customPrices === 'object') {
      for (const [k, v] of Object.entries(c.customPrices)) {
        initialPrices[k] = String(v);
      }
    }
    setProductPrices(initialPrices);
  };

  const handleToggleProduct = (code: string) => {
    setSelectedProducts((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSelectAllProducts = () => {
    setSelectedProducts(PRODUCTS_CATALOG.map((p) => p.code));
  };

  const handleDeselectAllProducts = () => {
    setSelectedProducts([]);
  };

  const handleProductPriceChange = (code: string, value: string) => {
    setProductPrices((prev) => ({ ...prev, [code]: value }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;

    setSaving(true);
    try {
      const customPricesObj: Record<string, number> = {};
      for (const [k, v] of Object.entries(productPrices)) {
        if (v !== '' && !isNaN(Number(v))) {
          customPricesObj[k] = Number(v);
        }
      }

      const isAllSelected = selectedProducts.length === PRODUCTS_CATALOG.length;

      const res = await api.put(`/api/admin/companies/${editingCompany.id}`, {
        accountType,
        billingDueDate,
        customQueryPrice: customQueryPrice ? parseFloat(customQueryPrice) : null,
        creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
        isActive,
        allowedProducts: isAllSelected ? ['ALL'] : selectedProducts,
        customPrices: Object.keys(customPricesObj).length > 0 ? customPricesObj : null
      });

      if (res.data?.success) {
        toast.success('Parâmetros comerciais e produtos atualizados com sucesso!');
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
                  <th className="py-3 px-4">Produtos & Tarifas</th>
                  <th className="py-3 px-4">Saldo ou Limite</th>
                  <th className="py-3 px-4 min-w-[280px]">Acesso API</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right min-w-[165px] whitespace-nowrap">Ações</th>
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
                    <td className="py-3 px-4">
                      {c.allowedProducts && !c.allowedProducts.includes('ALL') ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {c.allowedProducts.length} de {PRODUCTS_CATALOG.length} produtos
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Todos (16 produtos)
                        </span>
                      )}
                      {c.customPrices && Object.keys(c.customPrices).length > 0 ? (
                        <span className="block text-[10px] text-slate-500 mt-0.5 font-sans">
                          {Object.keys(c.customPrices).length} tarifas customizadas
                        </span>
                      ) : c.customQueryPrice ? (
                        <span className="block text-[10px] text-slate-500 mt-0.5 font-mono">
                          Tarifa global: R$ {Number(c.customQueryPrice).toFixed(2)}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {c.accountType === 'PRE_PAID' ? (
                        <span className="text-emerald-700 font-bold">R$ {Number(c.creditsBalance).toFixed(2)}</span>
                      ) : (
                        <span className="text-blue-700 font-bold">Limite: R$ {Number(c.creditLimit).toFixed(2)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 min-w-[280px]">
                      {c.apiKeys && c.apiKeys.length > 0 ? (
                        (() => {
                          const activeKeyObj = c.apiKeys.find((k: any) => k.isActive) || c.apiKeys[0];
                          const activeKey = activeKeyObj?.key || '';
                          const prodUrl = `https://api.renacred.com.br/v1/imobiliario/historico?token=${activeKey}&query=DOCUMENTO`;
                          return (
                            <div className="space-y-1.5">
                              {/* Token */}
                              <div className="flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => setApiKeyModalCompany(c)}
                                  className="px-2 py-0.5 rounded-lg text-[10.5px] font-mono font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center transition cursor-pointer"
                                  title="Ver/Gerenciar todas as chaves deste cliente"
                                >
                                  <KeyRound className="w-3 h-3 mr-1 text-purple-600 shrink-0" />
                                  <span className="truncate max-w-[150px]">{activeKey}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyKeyToClipboard(activeKey, `token-${c.id}`)}
                                  className="p-1 hover:text-purple-700 text-slate-400 hover:bg-slate-100 rounded-lg transition cursor-pointer shrink-0"
                                  title="Copiar Chave/Token"
                                >
                                  {copiedKeyId === `token-${c.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                                {c.apiKeys.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setApiKeyModalCompany(c)}
                                    className="text-[10px] text-purple-600 font-bold hover:underline shrink-0"
                                    title="Chaves adicionais"
                                  >
                                    +{c.apiKeys.length - 1}
                                  </button>
                                )}
                              </div>

                              {/* Link em Produção Abaixo */}
                              <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1 max-w-[300px] group hover:border-blue-300 transition">
                                <span className="text-[10px] text-blue-700 font-mono truncate select-all flex-1" title={prodUrl}>
                                  {prodUrl}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyKeyToClipboard(prodUrl, `url-${c.id}`)}
                                  className="p-0.5 hover:text-blue-700 text-slate-400 transition shrink-0 cursor-pointer"
                                  title="Copiar Link de Produção Completo"
                                >
                                  {copiedKeyId === `url-${c.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          );
                        })()
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
                    <td className="py-3 px-4 text-right whitespace-nowrap min-w-[165px]">
                      <div className="inline-flex items-center justify-end gap-1.5 flex-nowrap">
                        <button
                          type="button"
                          onClick={() => setApiKeyModalCompany(c)}
                          title="Chaves de API"
                          className="w-8 h-8 shrink-0 flex items-center justify-center bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl transition cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(c)}
                          title="Configurar Plano"
                          className="w-8 h-8 shrink-0 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreditModalCompany(c)}
                          title="Ajustar Saldo"
                          className="w-8 h-8 shrink-0 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition cursor-pointer"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCompany(c)}
                          title="Excluir Cliente"
                          className="w-8 h-8 shrink-0 flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition cursor-pointer"
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

      {/* Modal de Sucesso: Novo Cliente Criado com Chave de API */}
      {createdCompanyDetails && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cliente Cadastrado com Sucesso!</h3>
                  <p className="text-xs text-slate-500">{createdCompanyDetails.razaoSocial}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreatedCompanyDetails(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Token de API Gerado */}
              <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-900 uppercase tracking-wider text-[11px] flex items-center">
                    <KeyRound className="w-3.5 h-3.5 mr-1.5 text-purple-700" />
                    Chave de API de Produção
                  </span>
                  <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">Ativa</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={createdCompanyDetails.apiKey}
                    className="flex-1 bg-white border border-purple-200 rounded-xl px-3 py-2 font-mono text-[11px] text-purple-950 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => copyKeyToClipboard(createdCompanyDetails.apiKey, 'created-key')}
                    className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition cursor-pointer shrink-0"
                    title="Copiar Token"
                  >
                    {copiedKeyId === 'created-key' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* URL de Produção Pronta para o Cliente */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 space-y-2">
                <span className="font-bold text-blue-900 uppercase tracking-wider text-[11px] block">
                  Link de Produção para Consultas (GET)
                </span>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={`https://api.renacred.com.br/v1/imobiliario/historico?token=${createdCompanyDetails.apiKey}&query=DOCUMENTO`}
                    className="flex-1 bg-white border border-blue-200 rounded-xl px-3 py-2 font-mono text-[11px] text-blue-950 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => copyKeyToClipboard(`https://api.renacred.com.br/v1/imobiliario/historico?token=${createdCompanyDetails.apiKey}&query=DOCUMENTO`, 'created-url')}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition cursor-pointer shrink-0"
                    title="Copiar Link Completo"
                  >
                    {copiedKeyId === 'created-url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-blue-600">Substitua DOCUMENTO pelo CPF ou CNPJ que o cliente desejar pesquisar.</p>
              </div>

              {/* Credenciais de Acesso ao Portal do Assinante */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Acesso ao Portal do Assinante
                </span>
                <p className="text-slate-600">
                  Login: <strong className="text-slate-900 font-mono">{createdCompanyDetails.adminEmail}</strong>
                </p>
                <p className="text-slate-600">
                  Senha Inicial: <strong className="text-slate-900 font-mono">{createdCompanyDetails.adminPassword}</strong>
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const payload = `*DADOS DE ACESSO RENACRED*\nEmpresa: ${createdCompanyDetails.razaoSocial}\n\n*Acesso ao Portal do Assinante:*\nLink: https://renacred.com.br/login\nLogin: ${createdCompanyDetails.adminEmail}\nSenha: ${createdCompanyDetails.adminPassword}\n\n*Acesso via API / Sistema:*\nToken: ${createdCompanyDetails.apiKey}\nEndpoint de Consulta:\nhttps://api.renacred.com.br/v1/imobiliario/historico?token=${createdCompanyDetails.apiKey}&query=DOCUMENTO`;
                  navigator.clipboard.writeText(payload);
                  toast.success('Todos os dados de acesso foram copiados para a área de transferência!');
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-xs inline-flex items-center cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copiar Todos os Dados (WhatsApp/E-mail)
              </button>

              <button
                type="button"
                onClick={() => setCreatedCompanyDetails(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração Comercial e Produtos (Update) */}
      {editingCompany && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-3xl w-full shadow-2xl space-y-5 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 shrink-0">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                    <SlidersHorizontal className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Configuração Comercial & Produtos
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {editingCompany.razaoSocial} • <span className="font-mono">{editingCompany.cnpjCpf}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCompany(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Abas de Navegação */}
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2 shrink-0 text-xs">
              <button
                type="button"
                onClick={() => setModalTab('products')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
                  modalTab === 'products'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Produtos & Preços ({selectedProducts.length}/16)</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('billing')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
                  modalTab === 'billing'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Faturamento & Limites</span>
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="flex-1 overflow-hidden flex flex-col space-y-4 text-xs">
              {/* ABA 1: Matriz dos 16 Produtos & Preços Customizados */}
              {modalTab === 'products' && (
                <div className="flex-1 overflow-hidden flex flex-col space-y-3">
                  {/* Barra de Ações Rápidas */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 shrink-0">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar produto pelo código ou nome..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleSelectAllProducts}
                        className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg font-semibold text-[11px] transition cursor-pointer"
                      >
                        Liberar Todos (16)
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllProducts}
                        className="px-2.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg font-semibold text-[11px] transition cursor-pointer"
                      >
                        Bloquear Todos
                      </button>
                    </div>
                  </div>

                  {/* Lista com Rolagem dos 16 Produtos */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                    {PRODUCTS_CATALOG.filter((p) => {
                      const term = productSearch.trim().toLowerCase();
                      if (!term) return true;
                      return (
                        p.code.toLowerCase().includes(term) ||
                        p.name.toLowerCase().includes(term) ||
                        p.categoryLabel.toLowerCase().includes(term)
                      );
                    }).map((p) => {
                      const isEnabled = selectedProducts.includes(p.code);
                      const customPriceVal = productPrices[p.code] || '';

                      return (
                        <div
                          key={p.code}
                          className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isEnabled
                              ? 'bg-blue-50/30 border-blue-200 shadow-2xs'
                              : 'bg-slate-50/70 border-slate-200 opacity-60'
                          }`}
                        >
                          {/* Identificação e Toggle */}
                          <div className="flex items-start space-x-3 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              id={`prod-${p.code}`}
                              checked={isEnabled}
                              onChange={() => handleToggleProduct(p.code)}
                              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${p.badgeColor.bg} ${p.badgeColor.text} ${p.badgeColor.border}`}
                                >
                                  {p.code}
                                </span>
                                <label
                                  htmlFor={`prod-${p.code}`}
                                  className="text-xs font-bold text-slate-900 truncate cursor-pointer hover:text-blue-700"
                                >
                                  {p.name}
                                </label>
                                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-sans">
                                  {p.categoryLabel}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {p.description}
                              </p>
                            </div>
                          </div>

                          {/* Ajuste de Preço Customizado */}
                          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 font-medium block">
                                Padrão: R$ {p.defaultPrice.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-slate-400 font-mono text-[11px]">R$</span>
                              <input
                                type="number"
                                step="0.05"
                                min="0"
                                disabled={!isEnabled}
                                placeholder={p.defaultPrice.toFixed(2)}
                                value={customPriceVal}
                                onChange={(e) => handleProductPriceChange(p.code, e.target.value)}
                                className="w-20 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 font-mono text-right disabled:bg-slate-100 disabled:text-slate-400"
                                title="Preço unitário personalizado para este produto"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ABA 2: Faturamento & Limites Comerciais */}
              {modalTab === 'billing' && (
                <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                  {/* Modalidade */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1.5">Plano de Pagamento</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAccountType('PRE_PAID')}
                        className={`py-2.5 rounded-xl border font-bold transition cursor-pointer ${
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
                        className={`py-2.5 rounded-xl border font-bold transition cursor-pointer ${
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

                  {/* Tarifa Global Fallback */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Tarifa Padrão Global da Empresa (R$) — Fallback Opcional
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={customQueryPrice}
                      onChange={(e) => setCustomQueryPrice(e.target.value)}
                      placeholder="Deixe vazio para usar os preços individuais dos produtos"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 font-mono"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Se preenchido, substitui o preço padrão dos produtos que não possuírem preço customizado na aba anterior.
                    </p>
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
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="isActive" className="text-slate-700 font-semibold cursor-pointer">
                      Empresa Ativa e Liberada para Consultas
                    </label>
                  </div>
                </div>
              )}

              {/* Botões do Rodapé */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
                <span className="text-[11px] text-slate-400">
                  {selectedProducts.length} de {PRODUCTS_CATALOG.length} produtos habilitados
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingCompany(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
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

                      {/* Link em Produção Completo com a Chave */}
                      <div className="flex items-center space-x-1.5 bg-blue-50/70 border border-blue-200/70 rounded-xl px-2.5 py-1.5 text-[10.5px]">
                        <span className="text-blue-700 font-mono truncate select-all flex-1" title={`https://api.renacred.com.br/v1/imobiliario/historico?token=${k.key}&query=DOCUMENTO`}>
                          https://api.renacred.com.br/v1/imobiliario/historico?token={k.key}&query=DOCUMENTO
                        </span>
                        <button
                          type="button"
                          onClick={() => copyKeyToClipboard(`https://api.renacred.com.br/v1/imobiliario/historico?token=${k.key}&query=DOCUMENTO`, `modal-url-${k.id}`)}
                          className="p-1 hover:text-blue-900 text-blue-600 transition shrink-0 cursor-pointer"
                          title="Copiar Link de Produção Completo"
                        >
                          {copiedKeyId === `modal-url-${k.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
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
