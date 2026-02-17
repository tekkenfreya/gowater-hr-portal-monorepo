'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types/auth';
import { logger } from '@/lib/logger';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null
  });

  const handleExpiredToken = useCallback(() => {
    setAuthState({
      user: null,
      isLoading: false,
      error: null
    });
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/login')) {
      window.location.href = '/auth/login';
    }
  }, []);

  const verifyAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/verify');

      if (response.ok) {
        const data = await response.json();
        setAuthState({
          user: data.user,
          isLoading: false,
          error: null
        });
      } else if (response.status === 401) {
        handleExpiredToken();
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          error: null
        });
      }
    } catch (error) {
      logger.error('Auth verification failed', error);
      setAuthState({
        user: null,
        isLoading: false,
        error: 'Failed to verify authentication'
      });
    }
  }, [handleExpiredToken]);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setAuthState({
          user: data.user,
          isLoading: false,
          error: null
        });
        return { success: true };
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          error: data.error || 'Login failed'
        });
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      logger.error('Login network error', error);
      const errorMsg = 'Network error. Please try again.';
      setAuthState({
        user: null,
        isLoading: false,
        error: errorMsg
      });
      return { success: false, error: errorMsg };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      logger.error('Logout error', error);
    }

    setAuthState({
      user: null,
      isLoading: false,
      error: null
    });

    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  };

  useEffect(() => {
    // On login page: clear any stale httpOnly auth cookie and skip verify
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    if (path === '/' || path.includes('/auth/login')) {
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      setAuthState({ user: null, isLoading: false, error: null });
      return;
    }
    verifyAuth();
  }, [verifyAuth]);

  // Global fetch interceptor: auto-logout on 401 from any API call
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      if (response.status === 401 && url.includes('/api/') && !url.includes('/api/auth/login')) {
        handleExpiredToken();
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [handleExpiredToken]);

  return {
    ...authState,
    login,
    logout,
    refetch: verifyAuth
  };
}