import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData?: Partial<User>) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 >= Date.now()) {
          // Keep loading true until user is resolved
          fetchCurrentUser(token).finally(() => setLoading(false));
          return;
        } else {
          localStorage.removeItem('token');
        }
      } catch {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const fetchCurrentUser = async (token: string): Promise<void> => {
    try {
      const response = await fetch('/api/v1/auths/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const login = (token: string, userData?: Partial<User>) => {
    localStorage.setItem('token', token);
    if (userData && userData.id) {
      // We already have user data from the login response — no need for an extra round-trip
      setUser(userData as User);
    } else {
      fetchCurrentUser(token);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole,
    isAdmin: user?.role === 'admin',
  } as AuthContextType;

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
