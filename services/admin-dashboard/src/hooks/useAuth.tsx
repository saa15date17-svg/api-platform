import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signInCallback, userManager } from '../lib/oidc';

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
    console.log('[Auth] useEffect triggered, URL:', window.location.href);
    
    // Check if this is an OIDC callback (has code and state in URL)
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    
    console.log('[Auth] URL params:', { code: code ? code.substring(0, 20) + '...' : null, state });
    
    if (code && state) {
      console.log('[Auth] OIDC callback detected, starting signInCallback...');
      // This is an OIDC callback - exchange the ZITADEL token for a main-backend JWT
      signInCallback()
        .then(async (user) => {
          console.log('[Auth] signInCallback succeeded:', {
            hasIdToken: !!user?.id_token,
            hasAccessToken: !!user?.access_token,
            idTokenLen: user?.id_token?.length || 0,
            accessTokenLen: user?.access_token?.length || 0,
          });
          // Clear oidc-client-ts stored user to prevent silent renew attempts
          try { await userManager.removeUser(); } catch {}
          
          if (user && (user.id_token || user.access_token)) {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
            console.log('[Auth] Sending tokens to backend:', `${API_BASE}/api/v1/auths/zitadel/callback`);
            const resp = await fetch(`${API_BASE}/api/v1/auths/zitadel/callback`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id_token: user.id_token, access_token: user.access_token }),
            });
            console.log('[Auth] Backend response status:', resp.status);
            if (!resp.ok) {
              const err = await resp.json().catch(() => ({ detail: 'Token exchange failed' }));
              console.error('[Auth] Backend error:', err);
              throw new Error(err.detail || `HTTP ${resp.status}`);
            }
            const data = await resp.json();
            console.log('[Auth] Backend token received:', {
              hasToken: !!data.token,
              tokenLen: data.token?.length || 0,
              email: data.email,
              role: data.role,
            });
            localStorage.setItem('token', data.token);
            setUser({
              id: data.id,
              email: data.email,
              name: data.name,
              role: data.role,
              is_active: true,
              created_at: Date.now() / 1000,
            });
          } else {
            console.warn('[Auth] No tokens in OIDC user object');
          }
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname);
          setLoading(false);
        })
        .catch((err) => {
          console.error('[Auth] OIDC callback error:', err);
          setLoading(false);
        });
      return;
    }

    const token = localStorage.getItem('token');
    console.log('[Auth] Checking localStorage token:', { hasToken: !!token, tokenLen: token?.length || 0 });
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresAt = new Date(payload.exp * 1000);
        const now = new Date();
        console.log('[Auth] Token expires at:', expiresAt.toISOString(), 'now:', now.toISOString(), 'valid:', payload.exp * 1000 >= Date.now());
        
        if (payload.exp * 1000 >= Date.now()) {
          // Main-backend token - fetch user data
          fetchCurrentUser(token).finally(() => setLoading(false));
          return;
        } else {
          console.log('[Auth] Token expired, removing');
          localStorage.removeItem('token');
        }
      } catch (err) {
        console.error('[Auth] Failed to decode token:', err);
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const fetchCurrentUser = async (token: string): Promise<void> => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      console.log('[Auth] Fetching current user from:', `${API_BASE}/api/v1/auths/`);
      const response = await fetch(`${API_BASE}/api/v1/auths/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[Auth] Current user response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[Auth] Current user data:', { id: data.id, email: data.email, role: data.role });
        setUser(data);
      } else {
        console.error('[Auth] Failed to fetch current user:', response.status);
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch (err) {
      console.error('[Auth] Error fetching current user:', err);
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
    // Zitadel OIDC redirect is disabled for local auth
    const ZITADEL_ISSUER = null;
    const ZITADEL_CLIENT_ID = null;
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
