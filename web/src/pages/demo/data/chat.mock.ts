// ==============================================================================
// LogiSphere AI Demo — Chat Mock Fixtures
// Immutable seed data — never mutate directly; clone into screen state
// ==============================================================================

import type { ChatUser, ChatMessage } from '../../../types';

export const DEMO_USER: ChatUser = {
  id: 'demo-manager',
  name: 'Demo Manager',
  email: 'manager@logisphere.demo',
  role: 'ROLE_MANAGER',
  isOnline: true,
};

export const MOCK_CHAT_USERS: ChatUser[] = [
  {
    id: 'drv-raj',
    name: 'Raj Patel',
    email: 'raj.patel@logisphere.demo',
    role: 'ROLE_DRIVER',
    phoneNo: '+91 98765 11001',
    isOnline: true,
  },
  {
    id: 'drv-elena',
    name: 'Elena Rostova',
    email: 'elena.rostova@logisphere.demo',
    role: 'ROLE_DRIVER',
    phoneNo: '+91 98765 22002',
    isOnline: false,
  },
  {
    id: 'drv-marcus',
    name: 'Marcus Vance',
    email: 'marcus.vance@logisphere.demo',
    role: 'ROLE_DRIVER',
    phoneNo: '+91 98765 33003',
    isOnline: true,
  },
  {
    id: 'drv-priya',
    name: 'Priya Sharma',
    email: 'priya.sharma@logisphere.demo',
    role: 'ROLE_DRIVER',
    phoneNo: '+91 98765 44004',
    isOnline: false,
  },
  {
    id: 'drv-kavya',
    name: 'Kavya Nair',
    email: 'kavya.nair@logisphere.demo',
    role: 'ROLE_DRIVER',
    phoneNo: '+91 98765 66006',
    isOnline: true,
  },
];

export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-001',
    conversationId: 'conv-raj',
    senderId: 'drv-raj',
    receiverId: 'demo-manager',
    message: 'Manager, reached 60% of route. ETA still on track for Surat.',
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    status: 'READ',
  },
  {
    id: 'msg-002',
    conversationId: 'conv-raj',
    senderId: 'demo-manager',
    receiverId: 'drv-raj',
    message: 'Good. Keep me updated. Watch for traffic on NH-48 near Bharuch.',
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    status: 'READ',
  },
  {
    id: 'msg-003',
    conversationId: 'conv-raj',
    senderId: 'drv-raj',
    receiverId: 'demo-manager',
    message: 'Roger that. Will divert via Ankleshwar if needed.',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: 'READ',
  },
  {
    id: 'msg-004',
    conversationId: 'conv-marcus',
    senderId: 'drv-marcus',
    receiverId: 'demo-manager',
    message: 'Arrived at Kandla for pickup. Documents verified. Loading starts in 20 mins.',
    createdAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    status: 'READ',
  },
  {
    id: 'msg-005',
    conversationId: 'conv-marcus',
    senderId: 'demo-manager',
    receiverId: 'drv-marcus',
    message: 'Perfect. Contact Suresh at the port for the container handover paperwork.',
    createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    status: 'READ',
  },
];
