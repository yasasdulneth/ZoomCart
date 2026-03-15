import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  registerUser,
  loginUser,
  logoutUser,
  getUserById,
  subscribeToAuthState,
  type RegisterUserInput,
  type UserProfile,
  type AuthUser,
} from '../lib/services/auth';

type AuthContextValue = {
  currentUser: AuthUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  register: (data: RegisterUserInput) => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToAuthState(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await getUserById(user.id);
          setUserProfile(profile);
        } catch {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const register = useCallback(async (data: RegisterUserInput) => {
    const res = await registerUser(data);
    setCurrentUser(res.user);
    if (res.profile) setUserProfile(res.profile);
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await loginUser(identifier, password);
    setCurrentUser(res.user);
    if (res.profile) setUserProfile(res.profile);
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setCurrentUser(null);
    setUserProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!currentUser) return null;
    try {
      const profile = await getUserById(currentUser.id);
      setUserProfile(profile);
      return profile;
    } catch {
      return null;
    }
  }, [currentUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      userProfile,
      loading,
      isAuthenticated: !!currentUser,
      register,
      login,
      logout,
      refreshProfile,
    }),
    [currentUser, userProfile, loading, register, login, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useAuthOptional() {
  return useContext(AuthContext);
}

