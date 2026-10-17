import { create } from 'zustand';
import axios from '../api/axiosClient';
import { GetNotifications } from '../api/apiPath';

export type NotificationItem = {
  id: string;
  userId?: string;
  role?: string;
  type?: string;
  category?: string;
  title: string;
  message: string;
  tripId?: string;
  createdAt: string;
  read: boolean;
};

type NotificationState = {
  loading: boolean;
  notifications: NotificationItem[];
  tripNotifications: NotificationItem[];
  unreadCount: number;
  tripUnreadCount: number;
  error: string | null;
  getNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
};

export const isTripNotification = (n: any): boolean => {
  const title = String(n?.title || '').toUpperCase();
  const msg = String(n?.message || n?.body || '').toUpperCase();
  const type = String(n?.type || '').toUpperCase();
  const category = String(n?.category || '').toUpperCase();

  // Exclude SOS / Emergency alerts
  if (
    title.includes('SOS') ||
    title.includes('EMERGENCY') ||
    msg.includes('SOS') ||
    msg.includes('EMERGENCY') ||
    type === 'SOS' ||
    category === 'EMERGENCY'
  ) {
    return false;
  }

  // Must be trip-related
  return Boolean(
    n?.tripId ||
    n?.tripid ||
    type === 'TRIP' ||
    title.includes('TRIP') ||
    msg.includes('TRIP')
  );
};

export const normalizeNotification = (n: any): NotificationItem => {
  const rawDate = n?.createdAt || n?.createdat || n?.created_at;
  const dateObj = rawDate ? new Date(rawDate) : new Date();
  const validDate = !isNaN(dateObj.getTime()) ? dateObj.toISOString() : new Date().toISOString();

  return {
    id: String(n?.id || Math.random()),
    userId: n?.userId || n?.userid,
    role: n?.role,
    type: n?.type,
    category: n?.category,
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
  tripNotifications: [],
  unreadCount: 0,
  tripUnreadCount: 0,
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
      const tripList = list.filter(isTripNotification);
      const unread = list.filter(n => !n.read).length;
      const tripUnread = tripList.filter(n => !n.read).length;
      set({
        loading: false,
        notifications: list,
        tripNotifications: tripList,
        unreadCount: unread,
        tripUnreadCount: tripUnread,
        error: null,
      });
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to fetch notifications' });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await axios.put(`${GetNotifications}/${id}/read`);
      const updated = get().notifications.map(n => (n.id === id ? { ...n, read: true } : n));
      const tripList = updated.filter(isTripNotification);
      const unread = updated.filter(n => !n.read).length;
      const tripUnread = tripList.filter(n => !n.read).length;
      set({
        notifications: updated,
        tripNotifications: tripList,
        unreadCount: unread,
        tripUnreadCount: tripUnread,
      });
    } catch (error) {
      // Local fallback mark read
      const updated = get().notifications.map(n => (n.id === id ? { ...n, read: true } : n));
      const tripList = updated.filter(isTripNotification);
      const unread = updated.filter(n => !n.read).length;
      const tripUnread = tripList.filter(n => !n.read).length;
      set({
        notifications: updated,
        tripNotifications: tripList,
        unreadCount: unread,
        tripUnreadCount: tripUnread,
      });
    }
  },
}));

export default useNotificationStore;
