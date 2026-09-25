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

const useNotificationStore = create<NotificationState>((set, get) => ({
  loading: false,
  notifications: [],
  unreadCount: 0,
  error: null,

  getNotifications: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(GetNotifications);
      const list: NotificationItem[] = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      
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
