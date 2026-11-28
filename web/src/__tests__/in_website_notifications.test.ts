// ==============================================================================
// LogiSphere AI — In-Website Notifications Test Suite (in_website_notifications.test.ts)
// Verifies:
// 1. Notification store subscription and reactive state
// 2. Chat message and Emergency SOS notification pushing
// 3. Floating banner dismissal lifecycle
// 4. Read receipts and unread badge counting
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { notificationStore } from '../stores/notificationStore';

describe('LogiSphere AI — In-Website Notifications System', () => {
  beforeEach(() => {
    notificationStore.clearAll();
  });

  describe('1. Push Notifications & Active Banner', () => {
    it('1.1 Pushes a team chat message notification and triggers banner', () => {
      notificationStore.pushNotification({
        type: 'CHAT',
        title: 'Team Dispatch Message',
        message: 'Manager, reached 60% of route. ETA still on track.',
        senderName: 'Raj Patel',
        routeTarget: 'chat',
        conversationId: 'conv-101',
      });

      const state = notificationStore.getState();
      expect(state.notifications.length).toBe(1);
      expect(state.unreadCount).toBe(1);
      expect(state.activeBanner).not.toBeNull();
      expect(state.activeBanner?.type).toBe('CHAT');
      expect(state.activeBanner?.senderName).toBe('Raj Patel');
      expect(state.activeBanner?.routeTarget).toBe('chat');
    });

    it('1.2 Pushes an emergency SOS alert notification with high priority banner', () => {
      notificationStore.pushNotification({
        type: 'ALERT',
        title: 'Emergency Distress Signal Broadcast',
        message: 'Engine overheating warning on highway shoulder.',
        driverName: 'Marcus Vance (TRUCK-11)',
        vehiclePlate: 'TRUCK-11',
        routeTarget: 'alerts',
        alertId: 'alert-sos-999',
      });

      const state = notificationStore.getState();
      expect(state.notifications.length).toBe(1);
      expect(state.unreadCount).toBe(1);
      expect(state.activeBanner?.type).toBe('ALERT');
      expect(state.activeBanner?.driverName).toBe('Marcus Vance (TRUCK-11)');
      expect(state.activeBanner?.routeTarget).toBe('alerts');
    });
  });

  describe('2. Banner Dismissal & History Preservation', () => {
    it('2.1 Dismisses active banner without deleting notification from history', () => {
      notificationStore.pushNotification({
        type: 'CHAT',
        title: 'Dispatch Update',
        message: 'Route approved',
        senderName: 'Elena Rostova',
        routeTarget: 'chat',
      });

      expect(notificationStore.getState().activeBanner).not.toBeNull();

      notificationStore.dismissBanner();

      const state = notificationStore.getState();
      expect(state.activeBanner).toBeNull();
      expect(state.notifications.length).toBe(1);
      expect(state.unreadCount).toBe(1);
    });
  });

  describe('3. Mark as Read and Badge Counts', () => {
    it('3.1 Marks specific notification as read and decrements unread count', () => {
      notificationStore.pushNotification({
        type: 'CHAT',
        title: 'Message 1',
        message: 'Hello',
        senderName: 'Raj Patel',
      });
      notificationStore.pushNotification({
        type: 'ALERT',
        title: 'SOS Alert',
        message: 'Urgent',
        driverName: 'Marcus Vance',
      });

      expect(notificationStore.getState().unreadCount).toBe(2);

      const firstId = notificationStore.getState().notifications[0].id;
      notificationStore.markAsRead(firstId);

      const state = notificationStore.getState();
      expect(state.unreadCount).toBe(1);
      expect(state.notifications.find((n) => n.id === firstId)?.read).toBe(true);
    });

    it('3.2 Marks all notifications as read', () => {
      notificationStore.pushNotification({ type: 'CHAT', title: 'M1', message: 'T1' });
      notificationStore.pushNotification({ type: 'ALERT', title: 'A1', message: 'T2' });

      expect(notificationStore.getState().unreadCount).toBe(2);

      notificationStore.markAllAsRead();

      const state = notificationStore.getState();
      expect(state.unreadCount).toBe(0);
      expect(state.notifications.every((n) => n.read)).toBe(true);
    });

    it('3.3 Clears all notifications', () => {
      notificationStore.pushNotification({ type: 'CHAT', title: 'M1', message: 'T1' });
      notificationStore.pushNotification({ type: 'ALERT', title: 'A1', message: 'T2' });

      notificationStore.clearAll();

      const state = notificationStore.getState();
      expect(state.notifications.length).toBe(0);
      expect(state.activeBanner).toBeNull();
      expect(state.unreadCount).toBe(0);
    });
  });
});
