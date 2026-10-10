import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const REMEMBER_ME_KEY = 'remember_me';

let sessionToken: string | null = null;
let sessionUser: unknown = null;

export const tokenStorage = {
  async getToken() {
    if (sessionToken) return sessionToken;
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async setToken(token: string, persist = true) {
    sessionToken = token;
    if (persist) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  },
  async removeToken() {
    sessionToken = null;
    await AsyncStorage.removeItem(TOKEN_KEY);
  },
  async getUser<T = unknown>() {
    if (sessionUser) return sessionUser as T;
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  async setUser(user: unknown, persist = true) {
    sessionUser = user;
    if (persist) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(USER_KEY);
    }
  },
  async removeUser() {
    sessionUser = null;
    await AsyncStorage.removeItem(USER_KEY);
  },
  async getRememberMe(): Promise<boolean> {
    const raw = await AsyncStorage.getItem(REMEMBER_ME_KEY);
    return raw === 'true';
  },
  async setRememberMe(remember: boolean) {
    if (remember) {
      await AsyncStorage.setItem(REMEMBER_ME_KEY, 'true');
    } else {
      await AsyncStorage.removeItem(REMEMBER_ME_KEY);
    }
  },
  async clearSession() {
    sessionToken = null;
    sessionUser = null;
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
      AsyncStorage.removeItem(REMEMBER_ME_KEY),
    ]);
  },
};
