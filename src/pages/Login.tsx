import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.isSuperAdmin) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Informe seu e-mail e senha para continuar.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/auth/login', { email, password });
      if (response.data?.success) {
        const { token, user: loggedUser } = response.data.data;
        login(token, loggedUser);
        toast.success(`Acesso autorizado. Olá, ${loggedUser.name || 'usuário'}!`);

        if (loggedUser.isSuperAdmin) {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'E-mail ou senha incorretos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    toast.info('Para redefinir sua senha, solicite suporte ao administrador da sua empresa.', {
      duration: 5000,
    });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between py-10 px-4 select-none">
      {/* Container Centralizado: Logo Maior + Formulário + Link para o início embaixo */}
      <div className="w-full max-w-sm mx-auto my-auto">
        {/* Logo Maior Centralizada */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link to="/" className="inline-block transition-transform hover:opacity-95">
            <img
              src="/logo-semfundo.png"
              alt="Renacred - Rede Nacional de Proteção ao Crédito"
              className="h-16 sm:h-20 w-auto object-contain mx-auto"
            />
          </Link>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-6">
            Acessar conta
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Entre com suas credenciais corporativas
          </p>
        </div>

        {/* Formulário com CSS ajustado */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              E-mail corporativo
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@empresa.com.br"
              required
              autoComplete="email"
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition shadow-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700"
              >
                Senha
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-blue-600 hover:text-blue-800 transition font-medium"
              >
                Esqueci a senha
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
                autoComplete="current-password"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition"
                aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center pt-1">
            <label className="flex items-center text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2"
              />
              Lembrar acesso neste computador
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#1D4ED8] hover:bg-[#1E40AF] active:bg-[#172554] text-white font-medium py-3 px-4 rounded-xl text-sm transition shadow-sm disabled:opacity-50 tracking-wide"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Link para voltar ao início embaixo */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors inline-block"
          >
            ← Voltar para a página inicial
          </Link>
        </div>
      </div>

      {/* Rodapé discreto */}
      <footer className="w-full max-w-sm mx-auto text-center text-xs text-slate-400 pt-6">
        <p>© {new Date().getFullYear()} Renacred. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
