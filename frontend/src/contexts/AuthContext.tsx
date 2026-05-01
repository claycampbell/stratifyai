import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  department?: string;
  title?: string;
  role: string;
  role_display_name: string;
  permissions: string[];
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonation: () => void;
  isImpersonating: boolean;
  originalUser: User | null;
}

interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  department?: string;
  title?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('accessToken')
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    localStorage.getItem('refreshToken')
  );
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalUser, setOriginalUser] = useState<User | null>(null);

  useEffect(() => {
    const handler = () => {
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [navigate]);

  useEffect(() => {
    if (accessToken) {
      loadUserProfile();
    } else {
      setLoading(false);
    }
  }, [accessToken]);

  const loadUserProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      const { user, accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

      setUser(user);
      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);

      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await api.post(`${API_URL}/auth/register`, data);

      const { user, accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

      setUser(user);
      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);

      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await api.post(`${API_URL}/auth/logout`, { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      navigate('/login', { replace: true });
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.permissions.includes('*')) return true;
    return user.permissions.includes(permission);
  };

  const hasAnyPermission = (...permissions: string[]): boolean => {
    if (!user) return false;
    if (user.permissions.includes('*')) return true;
    return permissions.some((permission) => user.permissions.includes(permission));
  };

  const impersonateUser = async (userId: string) => {
    try {
      const response = await api.post(`${API_URL}/users/impersonate/${userId}`);
      const { impersonatedUser, originalUser: origUser } = response.data;

      setOriginalUser(origUser);
      setUser(impersonatedUser);
      setIsImpersonating(true);

      sessionStorage.setItem('isImpersonating', 'true');
      sessionStorage.setItem('originalUser', JSON.stringify(origUser));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to impersonate user');
    }
  };

  const stopImpersonation = () => {
    if (!isImpersonating || !originalUser) return;

    setUser(originalUser);
    setOriginalUser(null);
    setIsImpersonating(false);

    sessionStorage.removeItem('isImpersonating');
    sessionStorage.removeItem('originalUser');

    api.post(`${API_URL}/users/stop-impersonation`).catch((error) => {
      console.error('Failed to log stop impersonation:', error);
    });
  };

  useEffect(() => {
    const impersonating = sessionStorage.getItem('isImpersonating') === 'true';
    const origUserStr = sessionStorage.getItem('originalUser');

    if (impersonating && origUserStr) {
      setIsImpersonating(true);
      setOriginalUser(JSON.parse(origUserStr));
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        login,
        register,
        logout,
        hasPermission,
        hasAnyPermission,
        impersonateUser,
        stopImpersonation,
        isImpersonating,
        originalUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
