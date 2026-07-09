import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signInCallback } from '../lib/oidc';

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
    // Check if this is an OIDC callback (has code and state in URL)
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    
    if (code && state) {
      // This is an OIDC callback - exchange the ZITADEL token for a main-backend JWT
      signInCallback()
        .then(async (user) => {
          if (user && (user.id_token || user.access_token)) {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
            const tokenToSend = user.id_token || user.access_token;
            const resp = await fetch(`${API_BASE}/api/v1/auths/zitadel/callback`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id_token: user.id_token, access_token: user.access_token }),
            });
            if (!resp.ok) {
              const err = await resp.json().catch(() => ({ detail: 'Token exchange failed' }));
              throw new Error(err.detail || `HTTP ${resp.status}`);
            }
            const data = await resp.json();
            localStorage.setItem('token', data.token);
            setUser({
              id: data.id,
              email: data.email,
              name: data.name,
              role: data.role,
              is_active: true,
              created_at: Date.now() / 1000,
            });
          }
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname);
          setLoading(false);
        })
        .catch((err) => {
          console.error('OIDC callback error:', err);
          setLoading(false);
        });
      return;
    }

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 >= Date.now()) {
          // Check if this is a ZITADEL token (has azp claim) or a main-backend token
          if (payload.azp || payload.iss?.includes('zitadel')) {
            // ZITADEL token detected - exchange it for a main-backend JWT
            const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
            fetch(`${API_BASE}/api/v1/auths/zitadel/callback`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id_token: token }),
            })
              .then(async (resp) => {
                if (!resp.ok) throw new Error('Token exchange failed');
                const data = await resp.json();
                localStorage.setItem('token', data.token);
                setUser({
                  id: data.id,
                  email: data.email,
                  name: data.name,
                  role: data.role,
                  is_active: true,
                  created_at: Date.now() / 1000,
                });
              })
              .catch(() => {
                localStorage.removeItem('token');
                setUser(null);
              })
              .finally(() => setLoading(false));
            return;
          } else {
            // Main-backend token - fetch user data
            fetchCurrentUser(token).finally(() => setLoading(false));
            return;
          }
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
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${API_BASE}/api/v1/auths/`, {
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

  const logout = async () => {
    localStorage.removeItem('token');
    setUser(null);
    // If using ZITADEL, redirect to ZITADEL logout
    const ZITADEL_ISSUER = import.meta.env.VITE_ZITADEL_ISSUER;
    const ZITADEL_CLIENT_ID = import.meta.env.VITE_ZITADEL_CLIENT_ID;
    if (ZITADEL_ISSUER && ZITADEL_CLIENT_ID) {
      const postLogoutUri = import.meta.env.VITE_ZITADEL_POST_LOGOUT_URI || window.location.origin;
      window.location.href = `${ZITADEL_ISSUER}/oidc/v1/end_session?client_id=${ZITADEL_CLIENT_ID}&post_logout_redirect_uri=${encodeURIComponent(postLogoutUri)}`;
    }
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
