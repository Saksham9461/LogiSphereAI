import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const tokenStorage = {
  async getToken() {
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async setToken(token: string) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },
  async removeToken() {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },
  async getUser<T = unknown>() {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  async setUser(user: unknown) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  async removeUser() {
    await AsyncStorage.removeItem(USER_KEY);
  },
  async clearSession() {
    await Promise.all([this.removeToken(), this.removeUser()]);
  },
};
