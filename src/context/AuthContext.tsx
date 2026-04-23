'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { normalizeAuthUser } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/api-base';
import { User, AuthTokens, AuthContextType, UserContext } from '@/types/auth';
import axios from 'axios';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'sm_user';
const TOKENS_STORAGE_KEY = 'sm_tokens';
const TOKEN_EXPIRY_KEY = 'sm_token_expiry';
const USER_CONTEXT_STORAGE_KEY = 'sm_user_context';
const normalizedApiBaseUrl = getApiBaseUrl();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [tokens, setTokensState] = useState<AuthTokens | null>(null);
  const [userContext, setUserContextState] = useState<UserContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKENS_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem(USER_CONTEXT_STORAGE_KEY);
    setUserState(null);
    setTokensState(null);
    setUserContextState(null);
  }, []);

  const isTokenExpired = useCallback(() => {
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryStr) return false;
    const expiry = parseInt(expiryStr, 10);
    return Date.now() > expiry;
  }, []);

  const setTokens = useCallback((newTokens: AuthTokens | null, expiresInSeconds?: number) => {
    setTokensState(newTokens);
    if (newTokens) {
      localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(newTokens));
      const expiryTime = Date.now() + ((expiresInSeconds || 3600) * 1000);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    } else {
      localStorage.removeItem(TOKENS_STORAGE_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const tokensStr = localStorage.getItem(TOKENS_STORAGE_KEY);
    if (!tokensStr) return false;

    try {
      const parsedTokens = JSON.parse(tokensStr);
      if (!parsedTokens?.refresh_token) return false;

      const response = await axios.post(
        `${normalizedApiBaseUrl}/auth/refresh`,
        null,
        { params: { refresh_token: parsedTokens.refresh_token } }
      );

      setTokens(
        {
          access_token: response.data?.access_token,
          refresh_token: response.data?.refresh_token || parsedTokens.refresh_token,
        },
        response.data?.expires_in || 3600
      );

      return true;
    } catch {
      clearAuth();
      return false;
    }
  }, [clearAuth, setTokens]);

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    const storedTokens = localStorage.getItem(TOKENS_STORAGE_KEY);
    const storedContext = localStorage.getItem(USER_CONTEXT_STORAGE_KEY);

    if (storedUser) {
      try {
        setUserState(normalizeAuthUser(JSON.parse(storedUser)));
      } catch (e) {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
    
    if (storedTokens) {
      try {
        setTokensState(JSON.parse(storedTokens));
      } catch (e) {
        localStorage.removeItem(TOKENS_STORAGE_KEY);
      }
    }

    if (storedContext) {
      try {
        setUserContextState(JSON.parse(storedContext));
      } catch (e) {
        localStorage.removeItem(USER_CONTEXT_STORAGE_KEY);
      }
    }
    
    setIsLoading(false);
  }, [isTokenExpired, clearAuth]);

  useEffect(() => {
    const checkExpiry = async () => {
      if (tokens && isTokenExpired()) {
        await refreshSession();
      }
    };

    const interval = setInterval(checkExpiry, 60000);
    return () => clearInterval(interval);
  }, [tokens, isTokenExpired, refreshSession]);

  const setUser = (newUser: User | null) => {
    const normalizedUser = normalizeAuthUser(newUser);
    setUserState(normalizedUser);
    if (normalizedUser) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  const setUserContext = (newContext: UserContext | null) => {
    setUserContextState(newContext);
    if (newContext) {
      localStorage.setItem(USER_CONTEXT_STORAGE_KEY, JSON.stringify(newContext));
    } else {
      localStorage.removeItem(USER_CONTEXT_STORAGE_KEY);
    }
  };

  const logout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      tokens, 
      userContext,
      setUser, 
      setTokens, 
      setUserContext,
      isAuthenticated: !!tokens?.access_token, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
