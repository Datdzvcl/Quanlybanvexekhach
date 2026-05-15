import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/authApi';
import {
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
  clearStoredAuth,
  getStoredToken,
  setStoredAuth,
} from '../services/httpClient';

const AuthContext = createContext(null);

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeUser(data) {
  const rawUser = data?.user || data?.User || data || {};
  return {
    token: data?.token || data?.Token || '',
    userId: rawUser?.userID || rawUser?.UserID || rawUser?.userId || rawUser?.id || '',
    fullName: rawUser?.fullName || rawUser?.FullName || rawUser?.name || '',
    email: rawUser?.email || rawUser?.Email || '',
    phone: rawUser?.phone || rawUser?.Phone || '',
    role: rawUser?.role || rawUser?.Role || 'Customer',
  };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(false);

  const logout = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  }, []);

  const getCurrentUser = useCallback(async () => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      logout();
      return null;
    }

    setLoading(true);
    try {
      const data = await authApi.me();
      const normalized = normalizeUser({ user: data, token: currentToken });
      setStoredAuth(currentToken, normalized);
      setToken(currentToken);
      setUser(normalized);
      return normalized;
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const login = useCallback(async ({ emailOrPhone, email, phone, login: loginValue, password }) => {
    setLoading(true);
    try {
      const data = await authApi.login({
        emailOrPhone,
        email,
        phone,
        login: loginValue,
        password,
      });
      const normalized = normalizeUser(data);
      if (!normalized.token) {
        throw new Error('API đăng nhập không trả về token.');
      }

      setStoredAuth(normalized.token, normalized);
      setToken(normalized.token);
      setUser(normalized);
      return normalized;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async ({ fullName, email, phone, password }) => {
    return authApi.register({ fullName, email, phone, password });
  }, []);

  useEffect(() => {
    const syncAuth = () => {
      setToken(localStorage.getItem(TOKEN_STORAGE_KEY));
      setUser(getStoredUser());
    };

    window.addEventListener('storage', syncAuth);
    return () => window.removeEventListener('storage', syncAuth);
  }, []);

  const value = useMemo(() => ({
    token,
    user,
    loading,
    isAuthenticated: Boolean(token),
    login,
    register,
    logout,
    getCurrentUser,
  }), [getCurrentUser, loading, login, logout, register, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
