import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

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

  // Configure axios interceptor for authentication
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        if (accessToken && config.url?.startsWith(API_URL)) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and we have a refresh token, try to refresh
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          refreshToken
        ) {
          originalRequest._retry = true;

          try {
            const response = await axios.post(`${API_URL}/auth/refresh`, {
              refreshToken,
            });

            const newAccessToken = response.data.accessToken;
            setAccessToken(newAccessToken);
            localStorage.setItem('accessToken', newAccessToken);

            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            handleLogout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [accessToken, refreshToken]);

  // Load user profile on mount if token exists
  useEffect(() => {
    if (accessToken) {
      loadUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUserProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
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
      const response = await axios.post(`${API_URL}/auth/register`, data);

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

  const handleLogout = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`, { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      handleLogout();
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
      const response = await axios.post(`${API_URL}/users/impersonate/${userId}`);
      const { impersonatedUser, originalUser: origUser } = response.data;

      // Store the original user
      setOriginalUser(origUser);

      // Set the impersonated user as current user
      setUser(impersonatedUser);
      setIsImpersonating(true);

      // Store impersonation state in sessionStorage (not localStorage)
      sessionStorage.setItem('isImpersonating', 'true');
      sessionStorage.setItem('originalUser', JSON.stringify(origUser));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to impersonate user');
    }
  };

  const stopImpersonation = () => {
    if (!isImpersonating || !originalUser) return;

    // Restore original user
    setUser(originalUser);
    setOriginalUser(null);
    setIsImpersonating(false);

    // Clear impersonation state
    sessionStorage.removeItem('isImpersonating');
    sessionStorage.removeItem('originalUser');

    // Log the action
    axios.post(`${API_URL}/users/stop-impersonation`).catch((error) => {
      console.error('Failed to log stop impersonation:', error);
    });
  };

  // Check for impersonation state on mount
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
