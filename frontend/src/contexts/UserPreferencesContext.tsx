import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '../types';
import { preferencesApi } from '../lib/api';
import { useAuth } from './AuthContext';

interface UserPreferencesContextType {
  preferences: UserPreferences;
  loading: boolean;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  getPreference: <K extends keyof UserPreferences>(key: K) => UserPreferences[K];
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { user, accessToken } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [loading, setLoading] = useState(true);

  // Load preferences when user logs in
  useEffect(() => {
    if (user && accessToken) {
      loadPreferences();
    } else {
      // Reset to defaults when logged out
      setPreferences(DEFAULT_USER_PREFERENCES);
      setLoading(false);
    }
  }, [user, accessToken]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await preferencesApi.get();
      setPreferences(response.data);
    } catch (error) {
      console.error('Failed to load user preferences:', error);
      // Fall back to defaults on error
      setPreferences(DEFAULT_USER_PREFERENCES);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = useCallback(
    async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      if (!user) return;

      // Save previous value for revert
      const previousValue = preferences[key];

      // Optimistic update
      setPreferences((prev) => ({ ...prev, [key]: value }));

      try {
        await preferencesApi.updateKey(key as string, value);
      } catch (error) {
        console.error(`Failed to update preference ${String(key)}:`, error);
        // Revert to previous value on error (don't reload all preferences)
        setPreferences((prev) => ({ ...prev, [key]: previousValue }));
        // Don't throw - allow UI to continue functioning
      }
    },
    [user, preferences]
  );

  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      if (!user) return;

      // Optimistic update
      setPreferences((prev) => ({ ...prev, ...updates }));

      try {
        const response = await preferencesApi.update(updates);
        setPreferences(response.data);
      } catch (error) {
        console.error('Failed to update preferences:', error);
        // Revert on error
        await loadPreferences();
        throw error;
      }
    },
    [user]
  );

  const resetPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const response = await preferencesApi.reset();
      setPreferences(response.data);
    } catch (error) {
      console.error('Failed to reset preferences:', error);
      throw error;
    }
  }, [user]);

  const getPreference = useCallback(
    <K extends keyof UserPreferences>(key: K): UserPreferences[K] => {
      return preferences[key];
    },
    [preferences]
  );

  return (
    <UserPreferencesContext.Provider
      value={{
        preferences,
        loading,
        updatePreference,
        updatePreferences,
        resetPreferences,
        getPreference,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a UserPreferencesProvider');
  }
  return context;
}

// Convenience hook for getting/setting a single preference
export function usePreference<K extends keyof UserPreferences>(key: K) {
  const { getPreference, updatePreference } = usePreferences();
  const value = getPreference(key);

  const setValue = useCallback(
    async (newValue: UserPreferences[K]) => {
      await updatePreference(key, newValue);
    },
    [key, updatePreference]
  );

  return [value, setValue] as const;
}
