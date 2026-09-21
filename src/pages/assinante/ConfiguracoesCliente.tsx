import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  User, 
  Lock, 
  ShieldCheck, 
  Save, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Phone, 
  MapPin, 
  Mail, 
  CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function ConfiguracoesCliente() {
  const { user, refreshProfile, login } = useAuth();
  const company = user?.company;

  // Estados da Empresa
  const [nomeFantasia, setNomeFantasia] = useState(company?.nomeFantasia || '');
  const [telefone, setTelefone] = useState(company?.telefone || '');
  const [endereco, setEndereco] = useState(company?.endereco || '');
  const [cidade, setCidade] = useState(company?.cidade || '');
  const [estado, setEstado] = useState(company?.estado || '');
  const [cep, setCep] = useState(company?.cep || '');
  const [loadingCompany, setLoadingCompany] = useState(false);

  // Estados do Usuário
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Estados de Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
    if (user?.company) {
      setNomeFantasia(user.company.nomeFantasia || '');
      setTelefone(user.company.telefone || '');
      setEndereco(user.company.endereco || '');
      setCidade(user.company.cidade || '');
      setEstado(user.company.estado || '');
      setCep(user.company.cep || '');
    }
  }, [user]);

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingCompany(true);
    try {
      const res = await api.put('/api/auth/company', {
        nomeFantasia,
        telefone,
        endereco,
        cidade,
        estado,
        cep,
      });

      if (res.data?.success) {
        toast.success('Dados cadastrais da empresa atualizados com sucesso!');
        await refreshProfile();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao atualizar dados da empresa.');
    } finally {
      setLoadingCompany(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Nome e e-mail são obrigatórios.');
      return;
    }

    setLoadingProfile(true);
    try {
      const res = await api.put('/api/auth/profile', {
        name: name.trim(),
        email: email.trim(),
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Dados do responsável atualizados com sucesso!');
        if (res.data.data?.token && res.data.data?.user) {
          login(res.data.data.token, res.data.data.user);
        } else {
          await refreshProfile();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao atualizar dados do usuário.');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Informe a senha atual para prosseguir.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A nova senha deve possuir pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('A confirmação não coincide com a nova senha digitada.');
      return;
    }

    setLoadingPassword(true);
    try {
      const res = await api.put('/api/auth/profile', {
        currentPassword,
        newPassword,
      });

      if (res.data?.success) {
        toast.success('Senha atualizada com sucesso!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao atualizar senha.');
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs">
        <div className="flex items-center space-x-2 text-[#1D4ED8] text-xs font-bold uppercase tracking-wider mb-2">
          <Building2 className="w-4 h-4" />
          <span>Perfil & Empresa</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Configurações da Conta
        </h2>
        <p className="text-slate-500 text-xs mt-1">
          Gerencie os dados cadastrais da sua empresa, informações do usuário responsável e credenciais de segurança.
        </p>
      </div>

      <div className="space-y-8">
        {/* Card 1: Dados Cadastrais da Empresa */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center">
            <Building2 className="w-4 h-4 mr-2 text-[#1D4ED8]" />
            Dados Cadastrais da Empresa
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Informações fiscais e de contato da sua organização.
          </p>

          <form onSubmit={handleUpdateCompany} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Razão Social (Bloqueada)
                </label>
                <input
                  type="text"
                  value={company?.razaoSocial || ''}
                  disabled
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-500 cursor-not-allowed font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  CNPJ (Bloqueado)
                </label>
                <input
                  type="text"
                  value={company?.cnpjCpf || ''}
                  disabled
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-500 cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  value={nomeFantasia}
                  onChange={(e) => setNomeFantasia(e.target.value)}
                  placeholder="Nome comercial da empresa..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Telefone / WhatsApp Comercial
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Endereço Completo
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Logradouro, número, complemento e bairro..."
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Cidade
                </label>
                <input
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Nome da cidade..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={estado}
                    onChange={(e) => setEstado(e.target.value.toUpperCase())}
                    placeholder="UF"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 uppercase transition font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    CEP
                  </label>
                  <input
                    type="text"
                    maxLength={9}
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="00000-000"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={loadingCompany}
                className="bg-[#1D4ED8] hover:bg-[#1E40AF] active:bg-[#172554] text-white text-xs font-medium px-5 py-2.5 rounded-xl flex items-center transition shadow-xs disabled:opacity-60"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {loadingCompany ? 'Salvando...' : 'Salvar Dados da Empresa'}
              </button>
            </div>
          </form>
        </div>

        {/* Card 2: Dados do Usuário Responsável */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center">
            <User className="w-4 h-4 mr-2 text-[#1D4ED8]" />
            Dados do Responsável pelo Acesso
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Nome do operador e e-mail utilizado para autenticação no painel Renacred.
          </p>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome do operador..."
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  E-mail de Login
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@empresa.com.br"
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={loadingProfile}
                className="bg-[#1D4ED8] hover:bg-[#1E40AF] active:bg-[#172554] text-white text-xs font-medium px-5 py-2.5 rounded-xl flex items-center transition shadow-xs disabled:opacity-60"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {loadingProfile ? 'Salvando...' : 'Salvar Dados Pessoais'}
              </button>
            </div>
          </form>
        </div>

        {/* Card 3: Alteração de Senha */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center">
            <Lock className="w-4 h-4 mr-2 text-amber-600" />
            Segurança & Senha
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Altere sua senha de acesso periodicamente para manter sua conta segura.
          </p>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Senha Atual
              </label>
              <div className="relative max-w-md">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual..."
                  required
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nova Senha
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 dígitos..."
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha..."
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={loadingPassword}
                className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-medium px-5 py-2.5 rounded-xl flex items-center transition shadow-xs disabled:opacity-60"
              >
                <Lock className="w-4 h-4 mr-1.5" />
                {loadingPassword ? 'Atualizando...' : 'Atualizar Senha'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
