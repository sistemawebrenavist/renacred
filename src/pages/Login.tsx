import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { RenacredLogo } from '../components/ui/RenacredLogo';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Informe seu e-mail e senha.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/auth/login', { email, password });
      if (response.data?.success) {
        login(response.data.data.token, response.data.data.user);
        toast.success('Autenticado com sucesso!');
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Credenciais inválidas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080E1A] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0B1325] border border-[#1E293B] rounded-2xl p-8 shadow-2xl">
        {/* Logo Oficial Centralizada */}
        <div className="flex flex-col items-center text-center mb-8">
          <RenacredLogo size="md" className="mb-3" />
          <p className="text-xs font-semibold text-slate-300 mt-1">
            Acesso Restrito ao Sistema de Consultas
          </p>
          <p className="text-[11px] text-slate-400">
            Rede Nacional de Proteção ao Crédito & Serventias Cartorárias
          </p>
        </div>

        {/* Formulário de Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              E-mail Corporativo
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com.br"
                required
                className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Senha de Segurança
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#1D4ED8] hover:bg-[#2563EB] text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center transition shadow-lg shadow-blue-900/30 disabled:opacity-50 tracking-wide"
          >
            {loading ? 'Validando Acesso...' : (
              <>
                Entrar no Sistema
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </form>

        {/* Rodapé Institucional */}
        <div className="mt-8 pt-6 border-t border-[#1E293B] flex items-center justify-center space-x-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Servidor Protegido e Auditado • DOI & Cartórios</span>
        </div>
      </div>
    </div>
  );
}
