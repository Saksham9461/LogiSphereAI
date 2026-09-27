import { create } from 'zustand';
import axios from '../api/axiosClient';
import { GetNotifications } from '../api/apiPath';

type NotificationItem = {
  id: string;
  userId?: string;
  role?: string;
  title: string;
  message: string;
  tripId?: string;
  createdAt: string;
  read: boolean;
};

type NotificationState = {
  loading: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  error: string | null;
  getNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
};

export const normalizeNotification = (n: any): NotificationItem => {
  const rawDate = n?.createdAt || n?.createdat || n?.created_at;
  const dateObj = rawDate ? new Date(rawDate) : new Date();
  const validDate = !isNaN(dateObj.getTime()) ? dateObj.toISOString() : new Date().toISOString();

  return {
    id: String(n?.id || Math.random()),
    userId: n?.userId || n?.userid,
    role: n?.role,
    title: String(n?.title || 'Notification'),
    message: String(n?.message || n?.body || ''),
    tripId: n?.tripId || n?.tripid,
    createdAt: validDate,
    read: Boolean(n?.read),
  };
};

const useNotificationStore = create<NotificationState>((set, get) => ({
  loading: false,
  notifications: [],
  unreadCount: 0,
  error: null,

  getNotifications: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(GetNotifications);
      const rawList: any[] = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      
      const list: NotificationItem[] = rawList.map(normalizeNotification);
      const unread = list.filter(n => !n.read).length;
      set({ loading: false, notifications: list, unreadCount: unread, error: null });
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to fetch notifications' });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await axios.put(`${GetNotifications}/${id}/read`);
      const updated = get().notifications.map(n => (n.id === id ? { ...n, read: true } : n));
      const unread = updated.filter(n => !n.read).length;
      set({ notifications: updated, unreadCount: unread });
    } catch (error) {
      // Local fallback mark read
      const updated = get().notifications.map(n => (n.id === id ? { ...n, read: true } : n));
      const unread = updated.filter(n => !n.read).length;
      set({ notifications: updated, unreadCount: unread });
    }
  },
}));

export default useNotificationStore;
