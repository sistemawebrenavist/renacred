import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface Company {
  id: string;
  razaoSocial: string;
  cnpjCpf: string;
  accountType: 'PRE_PAID' | 'POST_PAID';
  creditsBalance: number;
  creditLimit: number;
  billingDueDate: number;
  nomeFantasia?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  customQueryPrice?: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  company: Company;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const response = await api.get('/api/auth/profile');
      if (response.data?.success) {
        setUser(response.data.data);
        localStorage.setItem('@renacred:user', JSON.stringify(response.data.data));
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('@renacred:token');
    const storedUser = localStorage.getItem('@renacred:user');

    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        refreshProfile();
      } catch (e) {
        localStorage.removeItem('@renacred:token');
        localStorage.removeItem('@renacred:user');
      }
    }
    setLoading(false);
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('@renacred:token', token);
    localStorage.setItem('@renacred:user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('@renacred:token');
    localStorage.removeItem('@renacred:user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
