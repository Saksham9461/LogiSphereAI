// ==============================================================================
// LogiSphere AI — Real-time Chat & Internal Messaging Service
// Connects to /api/chat endpoints and ws:// /ws/chat?token=:token
// ==============================================================================

import { apiClient, getWsBaseUrl } from './apiClient';
import type { ChatUser, ChatMessage, ConversationSummary } from '../types';

export interface ChatWsCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onMessageReceived?: (msg: ChatMessage) => void;
  onMessage?: (msg: ChatMessage) => void;
}

// Global shared WebSocket manager for Chat to prevent duplicate connections or premature StrictMode closures
let sharedChatWs: WebSocket | null = null;
const chatSubscribers = new Set<ChatWsCallbacks>();
let chatReconnectTimer: any = null;

function ensureChatWsConnection() {
  if (typeof window === 'undefined') return;
  if (chatSubscribers.size === 0) return;
  if (sharedChatWs && (sharedChatWs.readyState === WebSocket.OPEN || sharedChatWs.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  const wsUrl = `${getWsBaseUrl()}/ws/chat?token=${encodeURIComponent(token)}`;

  try {
    const ws = new WebSocket(wsUrl);
    sharedChatWs = ws;

    ws.onopen = () => {
      chatSubscribers.forEach((cb) => {
        try {
          cb.onConnected?.();
        } catch {
          // ignore
        }
      });
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'chat:message' && payload.data) {
          chatSubscribers.forEach((cb) => {
            try {
              cb.onMessageReceived?.(payload.data);
              cb.onMessage?.(payload.data);
            } catch {
              // ignore
            }
          });
        }
      } catch {
        // silent parse error
      }
    };

    ws.onerror = () => {
      // Intentionally silent: prevent console noise
    };

    ws.onclose = () => {
      if (sharedChatWs === ws) {
        sharedChatWs = null;
      }
      chatSubscribers.forEach((cb) => {
        try {
          cb.onDisconnected?.();
        } catch {
          // ignore
        }
      });

      if (chatSubscribers.size > 0 && !chatReconnectTimer) {
        chatReconnectTimer = setTimeout(() => {
          chatReconnectTimer = null;
          ensureChatWsConnection();
        }, 5000);
      }
    };
  } catch {
    // Intentionally silent
  }
}

export const chatService = {
  async getUsers(): Promise<ChatUser[]> {
    const response = await apiClient.get('/api/chat/users');
    const data = response.data;
    const rawList = Array.isArray(data)
      ? data
      : Array.isArray(data?.users)
      ? data.users
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.serviceResult)
      ? data.serviceResult
      : [];

    return rawList.map((u: any) => ({
      id: String(u.id || u.userId || u.userid || ''),
      name: u.name || u.email?.split('@')[0] || 'Team Member',
      email: u.email || '',
      role: u.role || 'ROLE_DISPATCHER',
      phoneNo: u.phoneNo || u.phone || null,
      isOnline: Boolean(u.isOnline ?? false),
    }));
  },

  async getConversations(): Promise<ConversationSummary[]> {
    const response = await apiClient.get('/api/chat/conversations');
    const data = response.data;
    const rawList = Array.isArray(data)
      ? data
      : Array.isArray(data?.conversations)
      ? data.conversations
      : Array.isArray(data?.data)
      ? data.data
      : [];

    return rawList.map((c: any) => ({
      id: String(c.id || c.conversationId || ''),
      createdAt: c.createdAt || new Date().toISOString(),
      updatedAt: c.updatedAt || new Date().toISOString(),
      participant: {
        id: String(c.participant?.id || c.participantId || ''),
        name: c.participant?.name || 'Colleague',
        email: c.participant?.email || '',
        role: c.participant?.role || 'ROLE_DISPATCHER',
        phoneNo: c.participant?.phoneNo || null,
        isOnline: Boolean(c.participant?.isOnline ?? false),
      },
      lastMessage: c.lastMessage
        ? {
            id: String(c.lastMessage.id || ''),
            message: c.lastMessage.message || '',
            senderId: String(c.lastMessage.senderId || ''),
            receiverId: String(c.lastMessage.receiverId || ''),
            createdAt: c.lastMessage.createdAt || new Date().toISOString(),
          }
        : null,
      unreadCount: Number(c.unreadCount || 0),
    }));
  },

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const cleanId = encodeURIComponent(String(conversationId || '').trim().replace(/^#/, ''));
    const response = await apiClient.get(`/api/chat/conversations/${cleanId}/messages`);
    const data = response.data;
    const rawList = Array.isArray(data)
      ? data
      : Array.isArray(data?.data?.messages)
      ? data.data.messages
      : Array.isArray(data?.messages)
      ? data.messages
      : Array.isArray(data?.data)
      ? data.data
      : [];

    return rawList.map((m: any) => ({
      id: String(m.id || Math.random()),
      conversationId: String(m.conversationId || m.conversation_id || conversationId),
      senderId: String(m.senderId || m.sender_id || ''),
      receiverId: String(m.receiverId || m.receiver_id || ''),
      message: m.message || '',
      createdAt: m.createdAt || m.created_at || new Date().toISOString(),
      deliveredAt: m.deliveredAt || m.delivered_at || null,
      readAt: m.readAt || m.read_at || null,
      status: (m.status || (m.readAt ? 'READ' : m.deliveredAt ? 'DELIVERED' : 'SENT')).toUpperCase(),
    }));
  },

  async getOrCreateConversation(participantId: string): Promise<string> {
    const cleanId = String(participantId || '').trim();
    const response = await apiClient.post('/api/chat/conversations', {
      participantId: cleanId,
    });
    const data = response.data?.data || response.data?.serviceResult || response.data;
    return String(data?.id || data?.conversationId || '');
  },

  async sendMessage(
    conversationIdOrReceiverId: string,
    message: string,
    receiverId?: string
  ): Promise<ChatMessage> {
    let convId = String(conversationIdOrReceiverId || '').trim();
    const targetReceiver = String(receiverId || '').trim();

    // If no conversation ID, or if only receiverId was passed, resolve or create the conversation first
    if (!convId || convId === 'temp' || (targetReceiver && convId === targetReceiver)) {
      convId = await chatService.getOrCreateConversation(targetReceiver || convId);
    }

    const cleanConvId = encodeURIComponent(convId);
    const response = await apiClient.post(`/api/chat/conversations/${cleanConvId}/messages`, {
      message: message.trim(),
      receiverId: targetReceiver || undefined,
    });

    const data = response.data?.data || response.data?.message || response.data;
    return {
      id: String(data?.id || `msg-${Date.now()}`),
      conversationId: convId,
      senderId: String(data?.senderId || data?.sender_id || ''),
      receiverId: String(data?.receiverId || data?.receiver_id || targetReceiver),
      message: data?.message || message,
      createdAt: data?.createdAt || data?.created_at || new Date().toISOString(),
      status: (data?.status || 'SENT').toUpperCase(),
    };
  },

  async markRead(conversationId: string): Promise<void> {
    if (!conversationId || conversationId === 'temp') return;
    const cleanId = encodeURIComponent(String(conversationId || '').trim().replace(/^#/, ''));
    try {
      await apiClient.post(`/api/chat/conversations/${cleanId}/read`);
    } catch {
      // Gracefully handle markRead
    }
  },

  connectChatWs(
    tokenOrCallbacks?: string | ChatWsCallbacks,
    onMessage?: (msg: ChatMessage) => void
  ): () => void {
    if (typeof window === 'undefined') return () => {};

    let callbacks: ChatWsCallbacks = {};

    if (typeof tokenOrCallbacks === 'string') {
      if (onMessage) {
        callbacks = { onMessageReceived: onMessage };
      }
    } else if (tokenOrCallbacks) {
      callbacks = tokenOrCallbacks;
    }

    chatSubscribers.add(callbacks);

    if (sharedChatWs && sharedChatWs.readyState === WebSocket.OPEN) {
      try {
        callbacks.onConnected?.();
      } catch {
        // ignore
      }
    }

    ensureChatWsConnection();

    return () => {
      chatSubscribers.delete(callbacks);

      if (chatSubscribers.size === 0) {
        if (chatReconnectTimer) {
          clearTimeout(chatReconnectTimer);
          chatReconnectTimer = null;
        }
        if (sharedChatWs) {
          const wsToClose = sharedChatWs;
          sharedChatWs = null;
          try {
            if (wsToClose.readyState === WebSocket.OPEN) {
              wsToClose.close(1000, 'Normal Closure');
            } else if (wsToClose.readyState === WebSocket.CONNECTING) {
              // Wait for connection to open before closing, avoiding browser "closed before established" error
              wsToClose.onopen = () => {
                try {
                  wsToClose.close(1000, 'Normal Closure');
                } catch {
                  // ignore
                }
              };
              wsToClose.onerror = () => {};
              wsToClose.onclose = () => {};
            }
          } catch {
            // ignore
          }
        }
      }
    };
  },
};
