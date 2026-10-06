import { create } from 'zustand';
import { AppState, AppStateStatus } from 'react-native';
import client from '../api/axiosClient';
import { GetChatUsers, GetConversations, CreateConversation, GetMessages, WS_URL } from '../api/apiPath';
import { tokenStorage } from '../services/storage/tokenStorage';
import { isWithin24Hours } from '../utils/chatTimeUtils';

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phoneNo?: string | null;
  isOnline: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  message: string;
  messageType?: string;
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  status: 'SENT' | 'DELIVERED' | 'READ';
  tempId?: string;
}

export interface ConversationSummary {
  id: string;
  createdAt: string;
  updatedAt: string;
  participant: ChatUser;
  lastMessage: {
    id: string;
    message: string;
    senderId: string;
    receiverId: string;
    createdAt: string;
  } | null;
  unreadCount: number;
}

interface ChatState {
  socket: WebSocket | null;
  connectionStatus: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  activeParticipant: ChatUser | null;
  messages: Record<string, ChatMessage[]>;
  rosterUsers: ChatUser[];
  onlineUserIds: Set<string>;
  typingStates: Record<string, boolean>; // conversationId -> boolean
  loading: boolean;
  error: string | null;

  // Actions
  initSocket: () => Promise<void>;
  disconnectSocket: () => void;
  fetchRosterUsers: () => Promise<void>;
  fetchConversations: () => Promise<void>;
  selectConversation: (conversationId: string, participant: ChatUser) => Promise<void>;
  startConversationWithUser: (participantId: string) => Promise<string | null>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  markConversationAsRead: (conversationId: string) => void;
  sendTypingIndicator: (isTyping: boolean) => void;
  filterExpiredMessages: () => void;
}

let reconnectTimer: any = null;
let appStateSubscription: any = null;

const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  connectionStatus: 'DISCONNECTED',
  conversations: [],
  activeConversationId: null,
  activeParticipant: null,
  messages: {},
  rosterUsers: [],
  onlineUserIds: new Set<string>(),
  typingStates: {},
  loading: false,
  error: null,

  initSocket: async () => {
    const existingSocket = get().socket;
    if (existingSocket && (existingSocket.readyState === WebSocket.OPEN || existingSocket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = await tokenStorage.getToken();
    if (!token) {
      set({ connectionStatus: 'DISCONNECTED' });
      return;
    }

    set({ connectionStatus: 'CONNECTING' });

    try {
      const fullWsUrl = `${WS_URL}/ws/chat?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(fullWsUrl);

      ws.onopen = () => {
        console.log('[ChatSocket] Connected to WebSocket server');
        set({ socket: ws, connectionStatus: 'CONNECTED', error: null });
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }

        // Fetch conversations & roster on connect
        get().fetchConversations();
        get().fetchRosterUsers();

        // Sync active conversation messages if open
        const activeId = get().activeConversationId;
        if (activeId) {
          get().fetchMessages(activeId);
        }
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleIncomingSocketMessage(payload, set, get);
        } catch (err) {
          console.warn('[ChatSocket] Failed to parse socket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.warn('[ChatSocket Error]:', error);
      };

      ws.onclose = () => {
        console.log('[ChatSocket] Connection closed.');
        set({ socket: null, connectionStatus: 'DISCONNECTED' });

        // Auto-reconnect backoff
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            get().initSocket();
          }, 3000);
        }
      };

      // AppState listener for foreground/background network resume
      if (!appStateSubscription) {
        appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
          if (nextState === 'active') {
            get().initSocket();
            get().filterExpiredMessages();
          }
        });
      }
    } catch (err: any) {
      console.error('[ChatSocket Exception]:', err);
      set({ connectionStatus: 'DISCONNECTED', error: err.message });
    }
  },

  disconnectSocket: () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    const ws = get().socket;
    if (ws) {
      ws.close();
    }
    set({ socket: null, connectionStatus: 'DISCONNECTED' });
  },

  fetchRosterUsers: async () => {
    try {
      const res = await client.get(GetChatUsers);
      const rosterData = res.data?.data || res.data || [];
      if (Array.isArray(rosterData)) {
        set({ rosterUsers: rosterData });
      }
    } catch (err) {
      console.warn('[ChatStore] fetchRosterUsers error:', err);
    }
  },

  fetchConversations: async () => {
    try {
      set({ loading: true });
      const res = await client.get(GetConversations);
      const convList = res.data?.data || res.data || [];

      if (Array.isArray(convList)) {
        // Filter out expired last messages (> 24 hours)
        const validConvs = convList.map((c: ConversationSummary) => {
          const validLastMsg = c.lastMessage && isWithin24Hours(c.lastMessage.createdAt) ? c.lastMessage : null;
          return {
            ...c,
            lastMessage: validLastMsg,
            unreadCount: validLastMsg ? c.unreadCount : 0,
          };
        });
        set({ conversations: validConvs });
      }
    } catch (err) {
      console.warn('[ChatStore] fetchConversations error:', err);
    } finally {
      set({ loading: false });
    }
  },

  selectConversation: async (conversationId: string, participant: ChatUser) => {
    set({ activeConversationId: conversationId, activeParticipant: participant });
    await get().fetchMessages(conversationId);
    get().markConversationAsRead(conversationId);
  },

  startConversationWithUser: async (participantId: string) => {
    try {
      set({ loading: true });
      const res = await client.post(CreateConversation, { participantId });
      const convData = res.data?.data || res.data;
      if (convData && convData.id) {
        await get().fetchConversations();
        set({
          activeConversationId: convData.id,
          activeParticipant: convData.participant,
        });
        await get().fetchMessages(convData.id);
        return convData.id;
      }
      return null;
    } catch (err: any) {
      console.error('[ChatStore] startConversationWithUser error:', err);
      return null;
    } finally {
      set({ loading: false });
    }
  },

  fetchMessages: async (conversationId: string) => {
    try {
      const res = await client.get(GetMessages(conversationId));
      const msgData = res.data?.data?.messages || res.data?.messages || res.data || [];
      if (Array.isArray(msgData)) {
        // Filter strictly <= 24 hours
        const validMessages = msgData.filter((m: ChatMessage) => isWithin24Hours(m.createdAt));
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: validMessages,
          },
        }));
      }
    } catch (err) {
      console.warn('[ChatStore] fetchMessages error:', err);
    }
  },

  sendMessage: async (text: string) => {
    const { activeConversationId, activeParticipant, socket, connectionStatus } = get();
    if (!activeConversationId || !activeParticipant) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    const tempId = `temp-${Date.now()}`;

    if (socket && connectionStatus === 'CONNECTED' && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: 'chat:send',
          conversationId: activeConversationId,
          receiverId: activeParticipant.id,
          message: trimmed,
          tempId,
        })
      );
    } else {
      console.warn('[ChatStore] WebSocket disconnected, unable to send message');
    }
  },

  markConversationAsRead: (conversationId: string) => {
    const { socket, connectionStatus, messages, conversations } = get();

    // Mark locally
    const currentMsgs = messages[conversationId] || [];
    const hasUnread = currentMsgs.some((m) => m.status !== 'READ');

    if (hasUnread) {
      const updatedMsgs = currentMsgs.map((m) => ({ ...m, status: 'READ' as const, readAt: m.readAt || new Date().toISOString() }));
      set((state) => ({
        messages: { ...state.messages, [conversationId]: updatedMsgs },
        conversations: state.conversations.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
      }));
    }

    if (socket && connectionStatus === 'CONNECTED' && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: 'chat:read',
          conversationId,
        })
      );
    }
  },

  sendTypingIndicator: (isTyping: boolean) => {
    const { activeConversationId, activeParticipant, socket, connectionStatus } = get();
    if (!activeConversationId || !activeParticipant) return;

    if (socket && connectionStatus === 'CONNECTED' && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: 'chat:typing',
          conversationId: activeConversationId,
          receiverId: activeParticipant.id,
          isTyping,
        })
      );
    }
  },

  filterExpiredMessages: () => {
    set((state) => {
      const cleanMessages: Record<string, ChatMessage[]> = {};
      Object.keys(state.messages).forEach((convId) => {
        cleanMessages[convId] = (state.messages[convId] || []).filter((m) => isWithin24Hours(m.createdAt));
      });

      const cleanConvs = state.conversations.map((c) => {
        const validLast = c.lastMessage && isWithin24Hours(c.lastMessage.createdAt) ? c.lastMessage : null;
        return {
          ...c,
          lastMessage: validLast,
          unreadCount: validLast ? c.unreadCount : 0,
        };
      });

      return {
        messages: cleanMessages,
        conversations: cleanConvs,
      };
    });
  },
}));

function handleIncomingSocketMessage(payload: any, set: any, get: any) {
  switch (payload.type) {
    case 'chat:auth_success': {
      const onlineList = payload.data?.onlineUsers || [];
      set({ onlineUserIds: new Set(onlineList) });
      break;
    }

    case 'chat:user_status': {
      const { userId, status } = payload.data || {};
      if (userId) {
        set((state: ChatState) => {
          const newSet = new Set(state.onlineUserIds);
          if (status === 'ONLINE') newSet.add(userId);
          else newSet.delete(userId);
          return { onlineUserIds: newSet };
        });
      }
      break;
    }

    case 'chat:ack':
    case 'chat:message': {
      const data: ChatMessage = payload.data;
      if (!data || !data.conversationId) break;

      if (!isWithin24Hours(data.createdAt)) break;

      const convId = data.conversationId;
      const { activeConversationId } = get();

      set((state: ChatState) => {
        const existing = state.messages[convId] || [];
        // Prevent duplicates
        const filtered = existing.filter((m) => m.id !== data.id && (data.tempId ? m.id !== data.tempId : true));
        const updated = [...filtered, data].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        // Update conversation summary
        const updatedConvs = state.conversations.map((c) => {
          if (c.id === convId) {
            const isCurrentOpen = activeConversationId === convId;
            const newUnread = isCurrentOpen ? 0 : c.unreadCount + (payload.type === 'chat:message' ? 1 : 0);
            return {
              ...c,
              lastMessage: {
                id: data.id,
                message: data.message,
                senderId: data.senderId,
                receiverId: data.receiverId,
                createdAt: data.createdAt,
              },
              unreadCount: newUnread,
              updatedAt: data.createdAt,
            };
          }
          return c;
        });

        return {
          messages: {
            ...state.messages,
            [convId]: updated,
          },
          conversations: updatedConvs,
        };
      });

      // Automatically mark read if active conversation is currently open
      if (activeConversationId === convId && payload.type === 'chat:message') {
        get().markConversationAsRead(convId);
      }
      break;
    }

    case 'chat:delivered': {
      const { messageId, conversationId, deliveredAt } = payload.data || {};
      if (!conversationId) break;

      set((state: ChatState) => {
        const msgs = state.messages[conversationId] || [];
        const updated = msgs.map((m) => (m.id === messageId ? { ...m, status: 'DELIVERED' as const, deliveredAt } : m));
        return {
          messages: { ...state.messages, [conversationId]: updated },
        };
      });
      break;
    }

    case 'chat:read': {
      const { conversationId, messageIds, readAt } = payload.data || {};
      if (!conversationId) break;

      set((state: ChatState) => {
        const msgs = state.messages[conversationId] || [];
        const updated = msgs.map((m) => {
          if (!messageIds || messageIds.includes(m.id)) {
            return { ...m, status: 'READ' as const, readAt: readAt || m.readAt };
          }
          return m;
        });
        return {
          messages: { ...state.messages, [conversationId]: updated },
        };
      });
      break;
    }

    case 'chat:typing': {
      const { conversationId, isTyping } = payload.data || {};
      if (conversationId) {
        set((state: ChatState) => ({
          typingStates: {
            ...state.typingStates,
            [conversationId]: Boolean(isTyping),
          },
        }));
      }
      break;
    }

    default:
      break;
  }
}

export default useChatStore;
