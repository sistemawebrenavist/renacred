import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  ShieldCheck, 
  KeyRound, 
  Save, 
  CheckCircle2, 
  Eye, 
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function ConfiguracoesAdmin() {
  const { user, refreshProfile, login } = useAuth();

  // Estados dos Dados Pessoais
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Estados de Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Toggles de visibilidade de senha
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Nome e e-mail não podem ficar em branco.');
      return;
    }

    setLoadingProfile(true);
    try {
      const response = await api.put('/api/auth/profile', {
        name: name.trim(),
        email: email.trim(),
      });

      if (response.data?.success) {
        toast.success(response.data.message || 'Dados atualizados com sucesso!');
        // Atualiza o token se retornado e o perfil global
        if (response.data.data?.token && response.data.data?.user) {
          login(response.data.data.token, response.data.data.user);
        } else {
          await refreshProfile();
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar dados cadastrais.');
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
      const response = await api.put('/api/auth/profile', {
        currentPassword,
        newPassword,
      });

      if (response.data?.success) {
        toast.success('Senha atualizada com sucesso!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar senha.');
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs">
        <div className="flex items-center space-x-2 text-[#1D4ED8] text-xs font-bold uppercase tracking-wider mb-2">
          <ShieldCheck className="w-4 h-4" />
          <span>Perfil & Segurança</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Configurações da Conta
        </h2>
        <p className="text-slate-500 text-xs mt-1">
          Gerencie suas informações cadastrais de administrador e credenciais de acesso à plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Esquerda / Principal: Formulários */}
        <div className="lg:col-span-2 space-y-8">
          {/* Card: Dados do Perfil */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center">
              <User className="w-4 h-4 mr-2 text-[#1D4ED8]" />
              Dados do Administrador
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Atualize o nome de identificação exibido no painel e o e-mail de acesso.
            </p>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
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
                    placeholder="Seu nome completo..."
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
                    placeholder="seu.email@renacred.com.br"
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loadingProfile}
                  className="bg-[#1D4ED8] hover:bg-[#1E40AF] active:bg-[#172554] text-white text-xs font-medium px-5 py-2.5 rounded-xl flex items-center transition shadow-xs disabled:opacity-60"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  {loadingProfile ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>

          {/* Card: Alteração de Senha */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center">
              <Lock className="w-4 h-4 mr-2 text-amber-600" />
              Segurança & Senha
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Para alterar sua senha, confirme sua senha atual e defina a nova credencial.
            </p>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Senha Atual
                </label>
                <div className="relative">
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

        {/* Coluna Direita: Informações da Conta & Resumo */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center">
              <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
              Status da Conta
            </h4>

            <div className="space-y-4 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <span className="text-slate-400 block text-[11px]">Nível de Acesso</span>
                <span className="font-semibold inline-flex items-center mt-1 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                  Super Administrador
                </span>
              </div>

              <div className="pb-3 border-b border-slate-100">
                <span className="text-slate-400 block text-[11px]">Empresa Controladora</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {user?.company?.razaoSocial || 'Renacred Tecnologia'}
                </span>
              </div>

              <div className="pb-3 border-b border-slate-100">
                <span className="text-slate-400 block text-[11px]">CNPJ</span>
                <span className="font-mono text-slate-700 mt-0.5 block">
                  {user?.company?.cnpjCpf || '58.330.430/0001-83'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Infraestrutura Ativa</span>
                <span className="inline-flex items-center text-emerald-700 font-medium mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  API em Produção (VPS + Cloudflare)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
