import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, getAuthToken, setAuthToken, removeAuthToken } from '../api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  activeProjectId: number;
  setActiveProjectId: (id: number) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  quickSwitchUser: (username: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Preset demo accounts credentials
export const DEMO_CREDENTIALS: Record<string, { pass: string; title: string; role: string }> = {
  admin: { pass: 'Admin@12345', title: 'Alex Mercer', role: 'Administrator' },
  qamanager: { pass: 'Manager@12345', title: 'Sarah Jenkins', role: 'Quality Manager' },
  developer: { pass: 'Dev@12345', title: 'Liam Patel', role: 'Developer' },
  tester: { pass: 'Tester@12345', title: 'Elena Rostova', role: 'Tester' },
  reviewer: { pass: 'Reviewer@12345', title: 'Marcus Vance', role: 'Reviewer' },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [loading, setLoading] = useState<boolean>(true);
  const [activeProjectId, setActiveProjectId] = useState<number>(1);

  useEffect(() => {
    async function loadUser() {
      const storedToken = getAuthToken();
      if (storedToken) {
        try {
          const profile = await api.getMe();
          setUser(profile);
          setToken(storedToken);
        } catch {
          removeAuthToken();
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    }
    loadUser();

    const handleUnauthorized = () => {
      removeAuthToken();
      setUser(null);
      setToken(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.login({
      email: username.includes('@') ? username : undefined,
      username: username,
      password,
    });
    setAuthToken(res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors during logout
    } finally {
      removeAuthToken();
      setToken(null);
      setUser(null);
    }
  };

  const quickSwitchUser = async (username: string) => {
    const cred = DEMO_CREDENTIALS[username];
    if (cred) {
      await login(username, cred.pass);
    }
  };

  const refreshProfile = async () => {
    try {
      const profile = await api.getMe();
      setUser(profile);
    } catch (e) {
      console.error('Failed to refresh profile', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        activeProjectId,
        setActiveProjectId,
        login,
        logout,
        quickSwitchUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
