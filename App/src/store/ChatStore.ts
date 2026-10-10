import { create } from 'zustand';
import { AppState, AppStateStatus } from 'react-native';
import client from '../api/axiosClient';
import {
  GetChatUsers,
  GetConversations,
  CreateConversation,
  GetMessages,
  SendMessageRest,
  MarkConversationRead,
  WS_URL,
} from '../api/apiPath';
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
  currentUserId: string | null;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  activeParticipant: ChatUser | null;
  messages: Record<string, ChatMessage[]>;
  rosterUsers: ChatUser[];
  onlineUserIds: Set<string>;
  typingStates: Record<string, boolean>; // conversationId -> boolean
  loading: boolean;
  loadingMessages: boolean;
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
  markConversationAsRead: (conversationId: string) => Promise<void>;
  sendTypingIndicator: (isTyping: boolean) => void;
  filterExpiredMessages: () => void;
}

let reconnectTimer: any = null;
let pingInterval: any = null;
let appStateSubscription: any = null;
let activeSocketInstance: WebSocket | null = null;
let isConnecting = false;

const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  connectionStatus: 'DISCONNECTED',
  currentUserId: null,
  conversations: [],
  activeConversationId: null,
  activeParticipant: null,
  messages: {},
  rosterUsers: [],
  onlineUserIds: new Set<string>(),
  typingStates: {},
  loading: false,
  loadingMessages: false,
  error: null,

  initSocket: async () => {
    const existingSocket = activeSocketInstance || get().socket;
    if (
      existingSocket &&
      (existingSocket.readyState === WebSocket.OPEN || existingSocket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (isConnecting) {
      return;
    }
    isConnecting = true;

    try {
      const [token, user] = await Promise.all([
        tokenStorage.getToken(),
        tokenStorage.getUser(),
      ]);

      if (!token) {
        isConnecting = false;
        set({ connectionStatus: 'DISCONNECTED' });
        return;
      }

      const currentUserId = (user as any)?.id || (user as any)?.userID || null;
      set({ connectionStatus: 'CONNECTING', currentUserId });

      const fullWsUrl = `${WS_URL}/ws/chat?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(fullWsUrl);
      activeSocketInstance = ws;

      ws.onopen = () => {
        isConnecting = false;
        if (activeSocketInstance !== ws) {
          try { ws.close(); } catch (_) {}
          return;
        }

        set({ socket: ws, connectionStatus: 'CONNECTED', error: null });
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }

        // Setup application-level heartbeat ping every 20 seconds
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (activeSocketInstance === ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 20000);

        // Fetch conversations & roster on connect
        get().fetchConversations();
        get().fetchRosterUsers();

        // Sync active conversation messages if currently open
        const activeId = get().activeConversationId;
        if (activeId) {
          get().fetchMessages(activeId);
          get().markConversationAsRead(activeId);
        }
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'pong') {
            return;
          }
          handleIncomingSocketMessage(payload, set, get);
        } catch (err) {
          console.warn('[ChatSocket] Failed to parse socket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.warn('[ChatSocket Error]:', error);
      };

      ws.onclose = () => {
        if (activeSocketInstance === ws) {
          activeSocketInstance = null;
          isConnecting = false;
          if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
          }
          set({ socket: null, connectionStatus: 'DISCONNECTED' });

          // Auto-reconnect backoff
          if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null;
              get().initSocket();
            }, 3000);
          }
        }
      };

      // AppState listener for foreground/background network resume
      if (!appStateSubscription) {
        appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
          if (nextState === 'active') {
            get().initSocket();
            get().fetchConversations();
            get().filterExpiredMessages();
          }
        });
      }
    } catch (err: any) {
      isConnecting = false;
      console.error('[ChatSocket Exception]:', err);
      set({ connectionStatus: 'DISCONNECTED', error: err.message });
    }
  },

  disconnectSocket: () => {
    isConnecting = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    if (activeSocketInstance) {
      const wsToClose = activeSocketInstance;
      activeSocketInstance = null;
      try {
        wsToClose.close();
      } catch (_) {}
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
        // Filter out expired last messages (> 24 hours) and deduplicate by conversation id
        const seen = new Set<string>();
        const validConvs: ConversationSummary[] = [];

        for (const c of convList) {
          const cId = c?.id;
          if (!cId || seen.has(cId)) continue;
          seen.add(cId);

          const validLastMsg = c.lastMessage && isWithin24Hours(c.lastMessage.createdAt) ? c.lastMessage : null;
          validConvs.push({
            ...c,
            lastMessage: validLastMsg,
            unreadCount: validLastMsg ? c.unreadCount || 0 : 0,
          });
        }
        set({ conversations: validConvs });
      }
    } catch (err) {
      console.warn('[ChatStore] fetchConversations error:', err);
    } finally {
      set({ loading: false });
    }
  },

  selectConversation: async (conversationId: string, participant: ChatUser) => {
    set({ activeConversationId: conversationId, activeParticipant: participant, loadingMessages: true });
    // Immediately clear unread badge optimistically
    get().markConversationAsRead(conversationId);
    await get().fetchMessages(conversationId);
  },

  startConversationWithUser: async (participantId: string) => {
    try {
      set({ loading: true, loadingMessages: true });
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
      set({ loading: false, loadingMessages: false });
    }
  },

  fetchMessages: async (conversationId: string) => {
    try {
      set({ loadingMessages: true });
      const res = await client.get(GetMessages(conversationId));
      const msgData = res.data?.data?.messages || res.data?.messages || res.data || [];
      if (Array.isArray(msgData)) {
        // Filter strictly <= 24 hours and deduplicate by id
        const seenMsgIds = new Set<string>();
        const validMessages = msgData.filter((m: ChatMessage) => {
          if (!m || !m.id || seenMsgIds.has(m.id)) return false;
          seenMsgIds.add(m.id);
          return isWithin24Hours(m.createdAt);
        });
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: validMessages,
          },
        }));
      }
    } catch (err) {
      console.warn('[ChatStore] fetchMessages error:', err);
    } finally {
      set({ loadingMessages: false });
    }
  },

  sendMessage: async (text: string) => {
    const { activeConversationId, activeParticipant, socket, connectionStatus, currentUserId } = get();
    if (!activeConversationId || !activeParticipant) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const nowIso = new Date().toISOString();

    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId: activeConversationId,
      senderId: currentUserId || '',
      receiverId: activeParticipant.id,
      message: trimmed,
      messageType: 'TEXT',
      createdAt: nowIso,
      status: 'SENT',
      tempId,
    };

    // Optimistically update messages and move conversation to top
    set((state) => {
      const existing = state.messages[activeConversationId] || [];
      const updatedMessages = [...existing, optimisticMsg];

      // Update conversations list: update lastMessage, preserve unreadCount (0 since active), sort to top
      const convIndex = state.conversations.findIndex((c) => c.id === activeConversationId);
      let updatedConvs: ConversationSummary[];

      if (convIndex >= 0) {
        const targetConv = state.conversations[convIndex];
        const updatedTarget: ConversationSummary = {
          ...targetConv,
          lastMessage: {
            id: tempId,
            message: trimmed,
            senderId: currentUserId || '',
            receiverId: activeParticipant.id,
            createdAt: nowIso,
          },
          updatedAt: nowIso,
          unreadCount: 0,
        };
        updatedConvs = [
          updatedTarget,
          ...state.conversations.filter((_, idx) => idx !== convIndex),
        ];
      } else {
        updatedConvs = [
          {
            id: activeConversationId,
            createdAt: nowIso,
            updatedAt: nowIso,
            participant: activeParticipant,
            lastMessage: {
              id: tempId,
              message: trimmed,
              senderId: currentUserId || '',
              receiverId: activeParticipant.id,
              createdAt: nowIso,
            },
            unreadCount: 0,
          },
          ...state.conversations,
        ];
      }

      return {
        messages: {
          ...state.messages,
          [activeConversationId]: updatedMessages,
        },
        conversations: updatedConvs,
      };
    });

    // Try WebSocket send first
    let socketSent = false;
    const currentWs = activeSocketInstance || socket;
    if (currentWs && currentWs.readyState === WebSocket.OPEN) {
      try {
        currentWs.send(
          JSON.stringify({
            type: 'chat:send',
            conversationId: activeConversationId,
            receiverId: activeParticipant.id,
            message: trimmed,
            tempId,
          })
        );
        socketSent = true;
      } catch (err) {
        console.warn('[ChatStore] socket send failed, falling back to REST:', err);
      }
    }

    // If socket was not available, fallback to REST
    if (!socketSent) {
      try {
        const res = await client.post(SendMessageRest(activeConversationId), {
          message: trimmed,
          receiverId: activeParticipant.id,
          tempId,
        });
        const savedMsg = res.data?.data;
        if (savedMsg && savedMsg.id) {
          set((state) => {
            const existing = state.messages[activeConversationId] || [];
            const reconciled = existing.map((m) =>
              m.id === tempId || m.tempId === tempId ? { ...savedMsg, status: savedMsg.status || 'SENT' } : m
            );
            return {
              messages: {
                ...state.messages,
                [activeConversationId]: reconciled,
              },
            };
          });
        }
      } catch (err) {
        console.error('[ChatStore] REST fallback sendMessage error:', err);
      }
    }
  },

  markConversationAsRead: async (conversationId: string) => {
    const { socket, connectionStatus, messages } = get();

    // Optimistically mark messages as read and clear unread badge for this conversation
    const currentMsgs = messages[conversationId] || [];
    const readAtIso = new Date().toISOString();

    const updatedMsgs = currentMsgs.map((m) =>
      m.status !== 'READ' ? { ...m, status: 'READ' as const, readAt: m.readAt || readAtIso } : m
    );

    set((state) => ({
      messages: { ...state.messages, [conversationId]: updatedMsgs },
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      ),
    }));

    // Send via WebSocket
    const currentWs = activeSocketInstance || socket;
    if (currentWs && currentWs.readyState === WebSocket.OPEN) {
      try {
        currentWs.send(
          JSON.stringify({
            type: 'chat:read',
            conversationId,
          })
        );
      } catch (err) {
        console.warn('[ChatStore] socket send chat:read error:', err);
      }
    }

    // Also call REST read endpoint to guarantee DB update & backend sync
    try {
      await client.post(MarkConversationRead(conversationId));
    } catch (err) {
      console.warn('[ChatStore] markConversationAsRead REST sync error:', err);
    }
  },

  sendTypingIndicator: (isTyping: boolean) => {
    const { activeConversationId, activeParticipant, socket } = get();
    if (!activeConversationId || !activeParticipant) return;

    const currentWs = activeSocketInstance || socket;
    if (currentWs && currentWs.readyState === WebSocket.OPEN) {
      currentWs.send(
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
        const seen = new Set<string>();
        cleanMessages[convId] = (state.messages[convId] || []).filter((m) => {
          if (!m || !m.id || seen.has(m.id)) return false;
          seen.add(m.id);
          return isWithin24Hours(m.createdAt);
        });
      });

      const seenConvs = new Set<string>();
      const cleanConvs: ConversationSummary[] = [];
      for (const c of state.conversations) {
        if (!c || !c.id || seenConvs.has(c.id)) continue;
        seenConvs.add(c.id);
        const validLast = c.lastMessage && isWithin24Hours(c.lastMessage.createdAt) ? c.lastMessage : null;
        cleanConvs.push({
          ...c,
          lastMessage: validLast,
          unreadCount: validLast ? c.unreadCount || 0 : 0,
        });
      }

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
      const userId = payload.data?.userId;
      set((state: ChatState) => ({
        onlineUserIds: new Set(onlineList),
        currentUserId: userId || state.currentUserId,
      }));
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

    case 'chat:ack': {
      // Message acknowledgement from backend for current sender
      const data: ChatMessage = payload.data;
      if (!data || !data.conversationId) break;

      const convId = data.conversationId;
      set((state: ChatState) => {
        const existing = state.messages[convId] || [];
        // Replace tempId match with persisted message record
        const reconciled = existing.map((m) =>
          (data.tempId && m.tempId === data.tempId) || m.id === data.id
            ? { ...data, status: data.status || 'SENT' }
            : m
        );

        // If not in existing, add it
        const exists = reconciled.some((m) => m.id === data.id);
        const finalList = exists ? reconciled : [...reconciled, data];
        finalList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        // Update conversation lastMessage
        const updatedConvs = state.conversations.map((c) => {
          if (c.id === convId) {
            return {
              ...c,
              lastMessage: {
                id: data.id,
                message: data.message,
                senderId: data.senderId,
                receiverId: data.receiverId,
                createdAt: data.createdAt,
              },
              updatedAt: data.createdAt,
            };
          }
          return c;
        });

        return {
          messages: { ...state.messages, [convId]: finalList },
          conversations: updatedConvs,
        };
      });
      break;
    }

    case 'chat:message': {
      const data: ChatMessage = payload.data;
      if (!data || !data.conversationId) break;

      if (!isWithin24Hours(data.createdAt)) break;

      const convId = data.conversationId;
      const { activeConversationId, currentUserId, rosterUsers } = get();

      const isMe = data.senderId === currentUserId;
      const isCurrentOpen = activeConversationId === convId;

      set((state: ChatState) => {
        const existing = state.messages[convId] || [];

        // Check if message already received (deduplication)
        const alreadyReceived = existing.some((m) => m.id === data.id);
        if (alreadyReceived) {
          return state; // Do not increment unread or duplicate message!
        }

        const filtered = existing.filter((m) => (data.tempId ? m.id !== data.tempId : true));
        const updatedMessages = [...filtered, data].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        // Find existing conversation in list
        const convIndex = state.conversations.findIndex((c) => c.id === convId);
        let updatedConvs: ConversationSummary[];

        if (convIndex >= 0) {
          const targetConv = state.conversations[convIndex];
          // Rule: Increment unread count ONLY if message is NOT from me and conversation is NOT currently open
          const unreadIncrement = !isMe && !isCurrentOpen ? 1 : 0;
          const newUnread = isCurrentOpen ? 0 : targetConv.unreadCount + unreadIncrement;

          const updatedTarget: ConversationSummary = {
            ...targetConv,
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

          // Move updated conversation to top of the list
          updatedConvs = [
            updatedTarget,
            ...state.conversations.filter((_, idx) => idx !== convIndex),
          ];
        } else {
          // New conversation from sender that wasn't in state.conversations yet
          const participantUser = rosterUsers.find((u: ChatUser) => u.id === data.senderId) || {
            id: data.senderId,
            name: 'User',
            email: '',
            role: 'USER',
            isOnline: true,
          };

          const newConv: ConversationSummary = {
            id: convId,
            createdAt: data.createdAt,
            updatedAt: data.createdAt,
            participant: participantUser,
            lastMessage: {
              id: data.id,
              message: data.message,
              senderId: data.senderId,
              receiverId: data.receiverId,
              createdAt: data.createdAt,
            },
            unreadCount: isCurrentOpen ? 0 : 1,
          };

          updatedConvs = [newConv, ...state.conversations];
          // Refresh conversations in background to ensure all DB relations sync
          setTimeout(() => get().fetchConversations(), 500);
        }

        return {
          messages: {
            ...state.messages,
            [convId]: updatedMessages,
          },
          conversations: updatedConvs,
        };
      });

      // If active conversation is currently open, immediately mark as read on backend
      if (isCurrentOpen && !isMe) {
        get().markConversationAsRead(convId);
      }
      break;
    }

    case 'chat:delivered': {
      const { messageId, conversationId, deliveredAt } = payload.data || {};
      if (!conversationId) break;

      set((state: ChatState) => {
        const msgs = state.messages[conversationId] || [];
        const updated = msgs.map((m) =>
          m.id === messageId ? { ...m, status: 'DELIVERED' as const, deliveredAt } : m
        );
        return {
          messages: { ...state.messages, [conversationId]: updated },
        };
      });
      break;
    }

    case 'chat:read': {
      const { conversationId, messageIds, readAt, readerId } = payload.data || {};
      if (!conversationId) break;

      const { currentUserId } = get();
      const isReaderMe = readerId && readerId === currentUserId;

      set((state: ChatState) => {
        const msgs = state.messages[conversationId] || [];
        const updatedMsgs = msgs.map((m) => {
          if (!messageIds || messageIds.length === 0 || messageIds.includes(m.id)) {
            return { ...m, status: 'READ' as const, readAt: readAt || m.readAt || new Date().toISOString() };
          }
          return m;
        });

        // If reader is me (e.g. read on another device/session or this session confirmed), reset unread count to 0
        const updatedConvs = state.conversations.map((c) => {
          if (c.id === conversationId && (isReaderMe || state.activeConversationId === conversationId)) {
            return { ...c, unreadCount: 0 };
          }
          return c;
        });

        return {
          messages: { ...state.messages, [conversationId]: updatedMsgs },
          conversations: updatedConvs,
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
