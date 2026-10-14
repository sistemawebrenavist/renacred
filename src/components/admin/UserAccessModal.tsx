import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserCog, 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  ShieldCheck, 
  ShieldAlert, 
  UserPlus, 
  Calendar, 
  Clock, 
  RefreshCw,
  Mail,
  User as UserIcon,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';

interface UserAccessModalProps {
  isOpen: boolean;
  company: any | null;
  onClose: () => void;
  onUserUpdated?: () => void;
}

export const UserAccessModal: React.FC<UserAccessModalProps> = ({
  isOpen,
  company,
  onClose,
  onUserUpdated
}) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  
  // Estados para alteração de senha por usuário
  const [openPasswordFormUserId, setOpenPasswordFormUserId] = useState<string | null>(null);
  const [newPasswords, setNewPasswords] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [updatingPasswordUserId, setUpdatingPasswordUserId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Estados para criação de novo usuário
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  const fetchUsers = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/companies/${company.id}/users`);
      if (res.data?.success) {
        setUsers(res.data.data || []);
      }
    } catch (err: any) {
      console.error('Erro ao buscar usuários:', err);
      // Fallback para os usuários já presentes na empresa
      if (company.users && Array.isArray(company.users)) {
        setUsers(company.users);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && company) {
      setOpenPasswordFormUserId(null);
      setNewPasswords({});
      setShowCreateForm(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      fetchUsers();
    }
  }, [isOpen, company?.id]);

  if (!isOpen || !company) return null;

  // Gerador de senha forte aleatória
  const generateRandomPassword = (userId?: string) => {
    const charsUpper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const charsLower = 'abcdefghijkmnopqrstuvwxyz';
    const charsNums = '23456789';
    const charsSymbols = '!@#$%&*';

    let pass = 'Rnc!';
    for (let i = 0; i < 3; i++) pass += charsUpper.charAt(Math.floor(Math.random() * charsUpper.length));
    for (let i = 0; i < 2; i++) pass += charsNums.charAt(Math.floor(Math.random() * charsNums.length));
    for (let i = 0; i < 2; i++) pass += charsLower.charAt(Math.floor(Math.random() * charsLower.length));
    pass += charsSymbols.charAt(Math.floor(Math.random() * charsSymbols.length));

    if (userId) {
      setNewPasswords((prev) => ({ ...prev, [userId]: pass }));
      setShowPasswords((prev) => ({ ...prev, [userId]: true }));
      toast.info('Senha segura gerada automaticamente!');
    } else {
      setNewPassword(pass);
      setShowNewPassword(true);
      toast.info('Senha segura gerada automaticamente!');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    toast.success('Copiado para a área de transferência!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Alternar Status Ativo / Desativado do Usuário
  const handleToggleUserStatus = async (user: any) => {
    const newStatus = !user.isActive;
    setTogglingUserId(user.id);

    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, isActive: newStatus } : u))
    );

    try {
      const res = await api.put(`/api/admin/users/${user.id}/status`, {
        isActive: newStatus
      });

      if (res.data?.success) {
        toast.success(
          newStatus
            ? `Usuário ${user.email} ativado com sucesso!`
            : `Usuário ${user.email} desativado! Acesso ao sistema bloqueado.`
        );
        onUserUpdated?.();
      } else {
        fetchUsers();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao alterar status do usuário.');
      fetchUsers();
    } finally {
      setTogglingUserId(null);
    }
  };

  // Salvar Nova Senha do Usuário
  const handleSavePassword = async (userId: string, userEmail: string) => {
    const pass = (newPasswords[userId] || '').trim();
    if (!pass || pass.length < 6) {
      toast.error('A senha deve possuir no mínimo 6 caracteres.');
      return;
    }

    setUpdatingPasswordUserId(userId);
    try {
      const res = await api.put(`/api/admin/users/${userId}/password`, {
        newPassword: pass
      });

      if (res.data?.success) {
        toast.success(`Senha do usuário ${userEmail} alterada com sucesso!`);
        setNewPasswords((prev) => ({ ...prev, [userId]: '' }));
        setOpenPasswordFormUserId(null);
        onUserUpdated?.();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao alterar senha do usuário.');
    } finally {
      setUpdatingPasswordUserId(null);
    }
  };

  // Criar Novo Usuário para a Empresa
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      toast.error('E-mail e senha são obrigatórios.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setCreatingUser(true);
    try {
      const res = await api.post(`/api/admin/companies/${company.id}/users`, {
        name: newName || company.razaoSocial,
        email: newEmail,
        password: newPassword
      });

      if (res.data?.success) {
        toast.success('Novo usuário de acesso cadastrado com sucesso!');
        setShowCreateForm(false);
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        fetchUsers();
        onUserUpdated?.();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao criar usuário.');
    } finally {
      setCreatingUser(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Nunca acessou';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 z-10 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Acesso & Usuários do Assinante
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-slate-700">{company.razaoSocial}</span>
                <span>•</span>
                <span className="font-mono text-slate-500">{company.cnpjCpf}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informação Rápida da Assinatura */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${company.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span className="text-slate-600">Assinatura da Empresa:</span>
            <strong className={company.isActive ? 'text-emerald-700' : 'text-slate-500'}>
              {company.isActive ? 'Ativa' : 'Inativa / Bloqueada'}
            </strong>
          </div>
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 transition font-medium cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>

        {/* Conteúdo Principal / Lista de Usuários */}
        <div className="py-4 overflow-y-auto space-y-4 flex-1 pr-1">
          {loading && users.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
              Carregando dados dos usuários...
            </div>
          ) : users.length === 0 && !showCreateForm ? (
            <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
              <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto" />
              <div>
                <p className="text-xs font-bold text-amber-900">Nenhum usuário cadastrado para este assinante</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Esta empresa ainda não possui um usuário com credenciais de login para acessar o portal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(true);
                  setNewEmail(company.email || '');
                  setNewName(company.razaoSocial || '');
                  generateRandomPassword();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Criar Usuário de Acesso</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Barra de ação do topo */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Usuários ({users.length})
                </span>
                {!showCreateForm && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(true);
                      setNewEmail('');
                      setNewName('');
                      generateRandomPassword();
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Adicionar Usuário</span>
                  </button>
                )}
              </div>

              {/* Formulário de Criação de Novo Usuário (caso aberto) */}
              {showCreateForm && (
                <form onSubmit={handleCreateUser} className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4.5 space-y-3 text-xs animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-blue-600" />
                      Cadastrar Novo Usuário de Acesso
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="text-slate-400 hover:text-slate-600 text-[11px] font-semibold"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nome Completo</label>
                      <input
                        type="text"
                        placeholder="Nome do usuário"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">E-mail de Login *</label>
                      <input
                        type="email"
                        required
                        placeholder="email@cliente.com.br"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-700">Senha de Acesso *</label>
                      <button
                        type="button"
                        onClick={() => generateRandomPassword()}
                        className="text-[10.5px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-blue-500" />
                        <span>Gerar Senha Aleatória</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        placeholder="Mínimo 6 caracteres"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 pr-20 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        {newPassword && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(newPassword, 'new-user-pass')}
                            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                            title="Copiar Senha"
                          >
                            {copiedKey === 'new-user-pass' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={creatingUser}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {creatingUser ? 'Salvando...' : 'Cadastrar Usuário'}
                    </button>
                  </div>
                </form>
              )}

              {/* Lista dos Usuários Existentes */}
              {users.map((u) => {
                const isFormOpen = openPasswordFormUserId === u.id;
                const typedPassword = newPasswords[u.id] || '';
                const isPassVisible = showPasswords[u.id] || false;
                const isToggling = togglingUserId === u.id;
                const isSavingPass = updatingPasswordUserId === u.id;

                return (
                  <div 
                    key={u.id}
                    className={`border rounded-2xl p-4.5 space-y-3 text-xs transition-colors ${
                      u.isActive 
                        ? 'bg-slate-50/70 border-slate-200' 
                        : 'bg-rose-50/40 border-rose-200'
                    }`}
                  >
                    {/* Topo do Card do Usuário */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          u.isActive 
                            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                            : 'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}>
                          {u.name ? u.name.substring(0, 2).toUpperCase() : <UserIcon className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm leading-tight">{u.name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200/80 text-slate-700">
                              {u.role === 'COMPANY_ADMIN' ? 'Admin' : 'Usuário'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              u.isActive 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {u.isActive ? 'Ativo' : 'Desativado'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600 mt-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="font-mono text-slate-800 text-[11.5px]">{u.email}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(u.email, `mail-${u.id}`)}
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                              title="Copiar E-mail"
                            >
                              {copiedKey === `mail-${u.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Controle de Status (Ativar / Desativar Usuário) */}
                      <div className="flex items-center gap-2.5 sm:self-center self-end pt-2 sm:pt-0">
                        <span className="text-[11px] font-semibold text-slate-500">
                          {u.isActive ? 'Acesso Liberado' : 'Acesso Bloqueado'}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={u.isActive}
                          disabled={isToggling}
                          onClick={() => handleToggleUserStatus(u)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                            u.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          title={u.isActive ? 'Clique para desativar este usuário' : 'Clique para reativar este usuário'}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              u.isActive ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Alerta quando o usuário estiver desativado */}
                    {!u.isActive && (
                      <div className="bg-rose-100/70 border border-rose-200 rounded-xl p-2.5 flex items-start gap-2 text-rose-800 text-[11px]">
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Usuário Bloqueado:</strong> Este usuário não conseguirá acessar o portal web nem consultar produtos até ser reativado pelo administrador.
                        </div>
                      </div>
                    )}

                    {/* Metadados: Último Login e Data de Cadastro */}
                    <div className="flex items-center gap-4 text-[10.5px] text-slate-400 pt-1 border-t border-slate-200/60">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Último acesso: <strong className="text-slate-600">{formatDate(u.lastLogin)}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Criado em: <strong className="text-slate-600">{formatDate(u.createdAt)}</strong>
                      </span>
                    </div>

                    {/* Botão para Expandir Formulário de Alteração de Senha */}
                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          if (isFormOpen) {
                            setOpenPasswordFormUserId(null);
                          } else {
                            setOpenPasswordFormUserId(u.id);
                            generateRandomPassword(u.id);
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                          isFormOpen 
                            ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold' 
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                        <span>{isFormOpen ? 'Fechar Alteração de Senha' : 'Alterar Senha de Acesso'}</span>
                      </button>

                      <span className="text-[10px] text-slate-400 font-mono">ID: {u.id.substring(0, 8)}...</span>
                    </div>

                    {/* Formulário de Alteração de Senha (Expandido) */}
                    {isFormOpen && (
                      <div className="bg-white border border-amber-200 rounded-2xl p-4 space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-slate-800">
                            Definir Nova Senha para <span className="text-amber-700">{u.email}</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => generateRandomPassword(u.id)}
                            className="text-[10.5px] text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>Gerar Nova Senha</span>
                          </button>
                        </div>

                        <div className="relative">
                          <input
                            type={isPassVisible ? 'text' : 'password'}
                            value={typedPassword}
                            onChange={(e) => setNewPasswords({ ...newPasswords, [u.id]: e.target.value })}
                            placeholder="Digite ou gere uma nova senha (mínimo 6 caracteres)"
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 pr-20 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
                          />
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setShowPasswords({ ...showPasswords, [u.id]: !isPassVisible })}
                              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                              title={isPassVisible ? 'Ocultar Senha' : 'Ver Senha'}
                            >
                              {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            {typedPassword && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(typedPassword, `pass-${u.id}`)}
                                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                title="Copiar Senha Gerada"
                              >
                                {copiedKey === `pass-${u.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {typedPassword && (
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                            <span className="text-[10.5px] text-emerald-700 font-semibold flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Pronta para salvar ({typedPassword.length} caracteres)
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(typedPassword, `pass-${u.id}`)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg transition cursor-pointer"
                              >
                                {copiedKey === `pass-${u.id}` ? 'Copiada!' : 'Copiar Senha'}
                              </button>
                              <button
                                type="button"
                                disabled={isSavingPass || typedPassword.length < 6}
                                onClick={() => handleSavePassword(u.id, u.email)}
                                className="px-3.5 py-1 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold rounded-lg text-xs transition shadow-2xs cursor-pointer"
                              >
                                {isSavingPass ? 'Salvando...' : 'Salvar Nova Senha'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>{users.length} usuário(s) vinculado(s)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-xs transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
