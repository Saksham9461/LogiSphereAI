import {create} from 'zustand';
import client from '../api/axiosClient';
import {ChangePassword, Login, Signup, requestemail, resetPassword} from '../api/apiPath';
import {tokenStorage} from '../services/storage/tokenStorage';

import useTripStore from './TripStore';

type AuthState = {
  loading: boolean;
  user: any | null;
  token: string | null;
  error: string | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string, role: string) => Promise<any>;
  logout: () => Promise<void>;
  requestResetPassword: (email: string) => Promise<any>;
  resetUserPassword: (token: string, newPassword: string) => Promise<any>;
  signup: (payload: Record<string, unknown>) => Promise<any>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<any>;
};

const extractToken = (response: any) => {
  const data = response?.data || {};
  if (data?.token) return data.token;
  if (data?.accessToken) return data.accessToken;
  if (data?.data?.token) return data.data.token;
  if (data?.serviceResult?.token) return data.serviceResult.token;
  const authHeader = response?.headers?.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    return parts.length === 2 ? parts[1] : authHeader;
  }
  return null;
};

const useAuthStore = create<AuthState>(set => ({
  loading: false,
  user: null,
  token: null,
  error: null,

  hydrate: async () => {
    const [token, user] = await Promise.all([tokenStorage.getToken(), tokenStorage.getUser()]);
    set({token, user});
    if (user) {
      useTripStore.getState().initRealtimeSubscription(user);
    }
  },

  login: async (email, password, role) => {
    try {
      set({loading: true, error: null});
      const response = await client.post(Login, {email, password, role});
      const data = response.data || {};

      if (data.success === false) {
        const message = data.message || 'Login failed';
        set({loading: false, error: message});
        return {success: false, message};
      }

      const userData = data.serviceResult || data.user;
      const userToken = userData?.token || data.token || extractToken(response);

      if (userToken) {
        await tokenStorage.setToken(userToken);
      }
      if (userData) {
        await tokenStorage.setUser(userData);
        useTripStore.getState().initRealtimeSubscription(userData);
      }

      set({loading: false, user: userData, token: userToken, error: null});
      return {success: true, data: userData};
    } catch (error: any) {
      let message = 'Login failed';
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message === 'Network Error' || !error.response) {
        message = 'Network error. Unable to connect to server.';
      } else if (error.message) {
        message = error.message;
      }
      set({loading: false, error: message});
      return {success: false, message};
    }
  },

  logout: async () => {
    useTripStore.getState().unsubscribeRealtime();
    await tokenStorage.clearSession();
    set({user: null, token: null, error: null});
  },

  requestResetPassword: async email => {
    try {
      set({loading: true, error: null});
      const response = await client.get(requestemail, {params: {email}});
      set({loading: false});
      return {success: true, data: response.data};
    } catch (error: any) {
      const message = error.response?.data?.message || 'Something went wrong';
      set({loading: false, error: message});
      return {success: false, message};
    }
  },

  resetUserPassword: async (token, newPassword) => {
    try {
      set({loading: true, error: null});
      const response = await client.post(resetPassword, null, {params: {token, newPassword}});
      set({loading: false});
      return {success: true, data: response.data};
    } catch (error: any) {
      const message = error.response?.data?.message || 'Password reset failed';
      set({loading: false, error: message});
      return {success: false, message};
    }
  },

  signup: async payload => {
    try {
      set({loading: true, error: null});
      const response = await client.post(Signup, payload);
      const data = response.data || {};

      if (data.success === false) {
        const message = data.message || 'Signup failed';
        set({loading: false, error: message});
        return {success: false, message};
      }

      const userData = data.serviceResult || data.user;
      const newToken = data.token || userData?.token || extractToken(response);

      if (newToken) {
        await tokenStorage.setToken(newToken);
      }
      if (userData) {
        await tokenStorage.setUser(userData);
      }

      set({loading: false, user: userData || null, token: newToken || null, error: null});
      return {success: true, data: userData || data};
    } catch (error: any) {
      let message = 'Signup failed';
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message === 'Network Error' || !error.response) {
        message = 'Network error. Unable to connect to server.';
      } else if (error.message) {
        message = error.message;
      }
      set({loading: false, error: message});
      return {success: false, message};
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      set({loading: true, error: null});
      const response = await client.post(ChangePassword, {currentPassword, newPassword});
      const data = response.data || {};

      if (data.success === false) {
        const message = data.message || 'Failed to change password';
        set({loading: false, error: message});
        return {success: false, message};
      }

      const userData = data.serviceResult || data.user;
      const userToken = userData?.token || data.token || extractToken(response);

      if (userData) {
        userData.mustChangePassword = false;
        userData.must_change_password = false;
        await tokenStorage.setUser(userData);
      }
      if (userToken) {
        await tokenStorage.setToken(userToken);
      }

      set((state: any) => ({
        loading: false,
        user: userData || (state.user ? { ...state.user, mustChangePassword: false, must_change_password: false } : null),
        token: userToken || state.token,
        error: null,
      }));
      return {success: true, data: userData};
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to change password';
      set({loading: false, error: message});
      return {success: false, message};
    }
  },
}));

export default useAuthStore;
