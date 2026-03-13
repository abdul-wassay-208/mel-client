import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '@/types';
import { apiLogin } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
  loading: boolean;
  setAuthFromToken: (user: User, token: string) => void;
  isAdmin: boolean;
  isLead: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('mel_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as User;
        setUser(parsed);
      } catch {
        localStorage.removeItem('mel_user');
        localStorage.removeItem('mel_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<User | null> => {
    try {
      const res = await apiLogin(email, password);
      const mappedUser: User = {
        id: String(res.user.id),
        name: res.user.name,
        email: res.user.email,
        role: res.user.role === 'ADMIN' ? 'admin' : 'project_lead',
      };
      localStorage.setItem('mel_token', res.token);
      localStorage.setItem('mel_user', JSON.stringify(mappedUser));
      setUser(mappedUser);
      return mappedUser;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mel_token');
    localStorage.removeItem('mel_user');
  };

  const setAuthFromToken = (mappedUser: User, token: string) => {
    localStorage.setItem('mel_token', token);
    localStorage.setItem('mel_user', JSON.stringify(mappedUser));
    setUser(mappedUser);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      loading,
      setAuthFromToken,
      isAdmin: user?.role === 'admin',
      isLead: user?.role === 'project_lead',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
