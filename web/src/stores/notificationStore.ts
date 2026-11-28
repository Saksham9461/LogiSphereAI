// ==============================================================================
// LogiSphere AI — In-Website Notification Store (notificationStore.ts)
// Observable notification store for real-time WebSocket chat messages & SOS alerts
// Symmetrical with App/src/store/NotificationStore.ts & ChatStore.ts
// ==============================================================================

import { useState, useEffect } from 'react';

export type NotificationType = 'CHAT' | 'ALERT' | 'INFO' | 'SUCCESS';

export interface InAppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  senderName?: string;
  driverName?: string;
  vehiclePlate?: string;
  timestamp: string;
  routeTarget?: string; // 'chat' or 'alerts'
  conversationId?: string;
  alertId?: string;
  read?: boolean;
}

export interface NotificationState {
  notifications: InAppNotification[];
  activeBanner: InAppNotification | null;
  unreadCount: number;
}

// Sound effects using Web Audio API (zero external assets needed)
function playNotificationChime(type: NotificationType) {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'ALERT') {
      // Urgent double high-frequency chime for emergency SOS
      const playBeep = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
      };

      playBeep(880, 0, 0.15);
      playBeep(1174.66, 0.18, 0.25);
    } else {
      // Soft gentle harmonic two-tone chime for team chat messages
      const playTone = (freq: number, startTime: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + 0.35);
      };

      playTone(523.25, 0); // C5
      playTone(659.25, 0.12); // E5
    }
  } catch {
    // Audio autoplay might be suspended by browser policy before first user gesture
  }
}

export const INITIAL_DEMO_NOTIFICATIONS: InAppNotification[] = [
  {
    id: 'notif-sos-active',
    type: 'ALERT',
    title: 'Emergency Distress Signal Broadcast',
    message: 'Engine overheating warning — vehicle stopped on highway shoulder.',
    driverName: 'Marcus Vance',
    vehiclePlate: 'TRUCK-11',
    timestamp: new Date().toISOString(),
    routeTarget: 'alerts',
    alertId: 'alert-00',
    read: false,
  },
  {
    id: 'notif-chat-latest',
    type: 'CHAT',
    title: 'Team Dispatch Message',
    message: 'Manager, reached 60% of route. ETA still on track for Surat.',
    senderName: 'Raj Patel',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    routeTarget: 'chat',
    conversationId: 'conv-raj-patel',
    read: false,
  },
];

class NotificationStore {
  private state: NotificationState = {
    notifications: [...INITIAL_DEMO_NOTIFICATIONS],
    activeBanner: INITIAL_DEMO_NOTIFICATIONS[0],
    unreadCount: INITIAL_DEMO_NOTIFICATIONS.length,
  };

  private listeners: Set<(state: NotificationState) => void> = new Set();
  private bannerTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.bannerTimer = setTimeout(() => {
        this.dismissBanner();
      }, 7000);
    }
  }

  public getState(): NotificationState {
    return this.state;
  }

  public subscribe(listener: (state: NotificationState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  /**
   * Pushes a new incoming notification (from WebSocket or user action)
   */
  public pushNotification(item: Omit<InAppNotification, 'id' | 'timestamp' | 'read'> & { id?: string }) {
    const id = item.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const notification: InAppNotification = {
      ...item,
      id,
      timestamp: new Date().toISOString(),
      read: false,
    };

    // Clear existing auto-dismiss timer
    if (this.bannerTimer) {
      clearTimeout(this.bannerTimer);
      this.bannerTimer = null;
    }

    // Play subtle chime
    playNotificationChime(notification.type);

    // Update state
    this.state = {
      ...this.state,
      notifications: [notification, ...this.state.notifications.slice(0, 49)], // Keep last 50
      activeBanner: notification,
      unreadCount: this.state.unreadCount + 1,
    };
    this.notify();

    // Auto-dismiss banner after 6 seconds (matching mobile App)
    this.bannerTimer = setTimeout(() => {
      this.dismissBanner();
    }, 6000);
  }

  /**
   * Dismiss the floating toast banner
   */
  public dismissBanner() {
    if (this.bannerTimer) {
      clearTimeout(this.bannerTimer);
      this.bannerTimer = null;
    }
    if (this.state.activeBanner) {
      this.state = {
        ...this.state,
        activeBanner: null,
      };
      this.notify();
    }
  }

  /**
   * Mark single notification as read
   */
  public markAsRead(id: string) {
    let wasUnread = false;
    const updated = this.state.notifications.map((n) => {
      if (n.id === id && !n.read) {
        wasUnread = true;
        return { ...n, read: true };
      }
      return n;
    });

    if (wasUnread) {
      this.state = {
        ...this.state,
        notifications: updated,
        unreadCount: Math.max(0, this.state.unreadCount - 1),
      };
      this.notify();
    }
  }

  /**
   * Mark all notifications as read
   */
  public markAllAsRead() {
    this.state = {
      ...this.state,
      notifications: this.state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    };
    this.notify();
  }

  /**
   * Clear all notification history
   */
  public clearAll() {
    this.dismissBanner();
    this.state = {
      notifications: [],
      activeBanner: null,
      unreadCount: 0,
    };
    this.notify();
  }
}

export const notificationStore = new NotificationStore();

/**
 * Custom React Hook for accessing in-app notifications
 */
export function useNotifications() {
  const [state, setState] = useState<NotificationState>(() => notificationStore.getState());

  useEffect(() => {
    return notificationStore.subscribe((next) => {
      setState(next);
    });
  }, []);

  return {
    ...state,
    pushNotification: (item: Omit<InAppNotification, 'id' | 'timestamp' | 'read'> & { id?: string }) =>
      notificationStore.pushNotification(item),
    dismissBanner: () => notificationStore.dismissBanner(),
    markAsRead: (id: string) => notificationStore.markAsRead(id),
    markAllAsRead: () => notificationStore.markAllAsRead(),
    clearAll: () => notificationStore.clearAll(),
  };
}
