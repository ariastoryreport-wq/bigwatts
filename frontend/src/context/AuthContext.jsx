import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import { useCountry } from './CountryContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { switchCountry } = useCountry();
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // Sync country context to user's account country
  const syncCountry = useCallback((userData) => {
    if (userData?.country_code) {
      switchCountry(userData.country_code);
    }
  }, [switchCountry]);

  const fetchUser = useCallback(async () => {
    const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
    if (!tokens.access) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authAPI.getMe();
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      syncCountry(data);
    } catch {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('tokens');
    } finally {
      setLoading(false);
    }
  }, [syncCountry]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (credentials) => {
    const { data } = await authAPI.login(credentials);
    localStorage.setItem('tokens', JSON.stringify(data.tokens));
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    syncCountry(data.user);
    return data.user;
  };

  const register = async (formData) => {
    const { data } = await authAPI.register(formData);
    localStorage.setItem('tokens', JSON.stringify(data.tokens));
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    syncCountry(data.user);
    return data.user;
  };

  const googleLogin = async ({ token, role, country_code }) => {
    const { data } = await authAPI.googleAuth({ token, role, country_code });
    localStorage.setItem('tokens', JSON.stringify(data.tokens));
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    syncCountry(data.user);
    return data.user;
  };

  const logout = async () => {
    const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
    try {
      await authAPI.logout({ refresh: tokens.refresh });
    } catch {
      // ignore
    }
    localStorage.removeItem('tokens');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (updatedData) => {
    const updated = { ...user, ...updatedData };
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, googleLogin, logout, updateUser, fetchUser,
      isAuthenticated: !!user,
      isPrestataire: user?.role === 'prestataire',
      isProprietaire: user?.role === 'proprietaire',
      isCustomerService: user?.role === 'customer_service',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
