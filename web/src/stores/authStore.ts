// ==============================================================================
// LogiSphere AI — Web Authentication & Session Store
// Integrates directly with POST /api/auth/login, POST /api/auth/change-password
// Handles JWT persistence, organization tenancy, and session hydration
// ==============================================================================

import { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import type { AuthUser } from '../types';

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  authStatus: AuthStatus;
  isAuthenticated: boolean;
  loading: boolean;
  user: AuthUser | null;
  token: string | null;
  error: string | null;
}

export function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    // Buffer by 10 seconds
    return Date.now() >= (payload.exp * 1000 - 10000);
  } catch {
    return true;
  }
}

class AuthStore {
  private state: AuthState = {
    authStatus: 'initializing',
    isAuthenticated: false,
    loading: false,
    user: null,
    token: null,
    error: null,
  };

  private listeners: Set<(state: AuthState) => void> = new Set();

  constructor() {
    this.hydrate();
  }

  public getState(): AuthState {
    return this.state;
  }

  public subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private setState(partial: Partial<AuthState>) {
    this.state = {
      ...this.state,
      ...partial,
      isAuthenticated:
        partial.authStatus !== undefined
          ? partial.authStatus === 'authenticated' && !!(partial.user ?? this.state.user)
          : this.state.authStatus === 'authenticated' && !!this.state.user,
    };
    this.notify();
  }

  public hydrate = async (): Promise<void> => {
    try {
      if (typeof window === 'undefined') return;

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');

      if (token && userStr) {
        if (isJwtExpired(token)) {
          console.warn('[AuthStore] Stored token expired. Clearing session.');
          this.clearSession();
          this.setState({ token: null, user: null, authStatus: 'unauthenticated' });
          return;
        }

        const user: AuthUser = JSON.parse(userStr);
        // Ensure active organization context in localStorage for multi-tenant requests
        const orgId = user.organization_id || user.organizationId;
        if (orgId) {
          localStorage.setItem('organizationId', orgId);
        }

        this.setState({ token, user, authStatus: 'authenticated', error: null });
      } else {
        this.clearSession();
        this.setState({ token: null, user: null, authStatus: 'unauthenticated' });
      }
    } catch (err) {
      console.warn('[AuthStore] Hydration error:', err);
      this.clearSession();
      this.setState({ token: null, user: null, authStatus: 'unauthenticated' });
    }
  };

  public login = async (
    email: string,
    password: string,
    role?: string,
    rememberMe: boolean = true
  ): Promise<{ success: boolean; data?: AuthUser; message?: string }> => {
    try {
      this.setState({ loading: true, error: null });

      const payload: { email: string; password: string; role?: string } = {
        email: email.trim().toLowerCase(),
        password,
      };

      if (role && role.trim()) {
        payload.role = role.trim();
      }

      const response = await apiClient.post('/api/auth/login', payload);
      const data = response.data;

      // Symmetrical resolution with backend auth structure
      const serviceResult = data.serviceResult || data.data || data;
      const token = serviceResult.token || data.token;
      const rawUser = serviceResult.user || serviceResult;

      if (!token) {
        throw new Error('Authentication response did not contain an access token');
      }

      const user: AuthUser = {
        id: String(rawUser.id || rawUser.userId || ''),
        userId: String(rawUser.id || rawUser.userId || ''),
        email: rawUser.email || payload.email,
        name: rawUser.name || rawUser.fullName || rawUser.email?.split('@')[0] || 'User',
        role: rawUser.role || (payload.role ?? 'ROLE_MANAGER'),
        phoneNo: rawUser.phoneNo || rawUser.phone || null,
        organizationId: rawUser.organization_id || rawUser.organizationId || null,
        organization_id: rawUser.organization_id || rawUser.organizationId || null,
        organizationName: rawUser.organizationName || rawUser.organization?.name || 'LogiSphere Fleet Operations',
        token,
        mustChangePassword: rawUser.mustChangePassword || false,
      };

      // Set tenancy header context
      const orgId = user.organization_id || user.organizationId;

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', token);
      storage.setItem('user', JSON.stringify(user));
      if (orgId) {
        storage.setItem('organizationId', orgId);
      }

      this.setState({
        loading: false,
        user,
        token,
        authStatus: 'authenticated',
        error: null,
      });

      return { success: true, data: user };
    } catch (error: any) {
      const message =
        error.response?.data?.message || error.message || 'Authentication error. Please try again.';
      this.setState({ loading: false, error: message });
      return { success: false, message };
    }
  };

  public logout = async (): Promise<void> => {
    this.clearSession();
    this.setState({
      user: null,
      token: null,
      authStatus: 'unauthenticated',
      error: null,
    });
  };

  public changePassword = async (
    currentOrPayload: string | { oldPassword?: string; currentPassword?: string; newPassword: string },
    newPass?: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      this.setState({ loading: true, error: null });

      let currentPassword = '';
      let newPassword = '';

      if (typeof currentOrPayload === 'object' && currentOrPayload !== null) {
        currentPassword = currentOrPayload.currentPassword || currentOrPayload.oldPassword || '';
        newPassword = currentOrPayload.newPassword;
      } else {
        currentPassword = currentOrPayload;
        newPassword = newPass || '';
      }

      const response = await apiClient.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });

      this.setState({ loading: false, error: null });
      return { success: true, message: response.data?.message || 'Password changed successfully' };
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to change password';
      this.setState({ loading: false, error: message });
      return { success: false, message };
    }
  };

  public clearError = () => {
    this.setState({ error: null });
  };

  private clearSession() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('organizationId');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('organizationId');
  }
}

export const authStore = new AuthStore();

export function useAuth(): AuthState & {
  login: typeof authStore.login;
  logout: typeof authStore.logout;
  changePassword: typeof authStore.changePassword;
  clearError: typeof authStore.clearError;
} {
  const [state, setState] = useState<AuthState>(authStore.getState());

  useEffect(() => {
    const unsubscribe = authStore.subscribe(setState);
    return () => unsubscribe();
  }, []);

  return {
    ...state,
    login: authStore.login,
    logout: authStore.logout,
    changePassword: authStore.changePassword,
    clearError: authStore.clearError,
  };
}
