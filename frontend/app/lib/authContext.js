'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, fetchCurrentUser, fetchDemoUsers } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Restore user session from localStorage on startup
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('sts_auth_token');
      const storedUser = localStorage.getItem('sts_auth_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Verify with backend silently
        fetchCurrentUser(storedToken)
          .then(verifiedUser => {
            setUser(verifiedUser);
            localStorage.setItem('sts_auth_user', JSON.stringify(verifiedUser));
          })
          .catch(() => {
            // keep stored user if offline or backend rebooting
          });
      }
    } catch {
      // ignore localStorage errors
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await loginUser(email, password);
    setUser(data.user);
    setToken(data.token);
    try {
      localStorage.setItem('sts_auth_token', data.token);
      localStorage.setItem('sts_auth_user', JSON.stringify(data.user));
    } catch {}
    setIsModalOpen(false);
    return data;
  };

  const register = async (userData) => {
    const data = await registerUser(userData);
    setUser(data.user);
    setToken(data.token);
    try {
      localStorage.setItem('sts_auth_token', data.token);
      localStorage.setItem('sts_auth_user', JSON.stringify(data.user));
    } catch {}
    setIsModalOpen(false);
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem('sts_auth_token');
      localStorage.removeItem('sts_auth_user');
    } catch {}
  };

  // Quick 1-click login for hackathon testing
  const quickLogin = async (role = 'donor') => {
    const demoAccounts = {
      donor: { email: 'donor@restaurant.com', password: 'donor123' },
      driver: { email: 'driver@rescue.org', password: 'driver123' },
      shelter: { email: 'shelter@hope.org', password: 'shelter123' },
    };
    const target = demoAccounts[role] || demoAccounts.donor;
    return login(target.email, target.password);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isModalOpen,
        openLoginModal: () => setIsModalOpen(true),
        closeLoginModal: () => setIsModalOpen(false),
        login,
        register,
        logout,
        quickLogin,
      }}
    >
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
