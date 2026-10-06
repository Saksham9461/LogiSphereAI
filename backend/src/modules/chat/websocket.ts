import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { db } from '../../config/database';

interface AuthenticatedSocket extends WebSocket {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
  isAlive?: boolean;
}

interface ChatMessagePayload {
  type: string;
  conversationId?: string;
  receiverId?: string;
  message?: string;
  messageType?: string;
  messageIds?: string[];
  isTyping?: boolean;
  tempId?: string;
}

// Map of userId -> Set of active WebSockets
const userSocketsMap = new Map<string, Set<AuthenticatedSocket>>();

export function isUserOnline(userId: string): boolean {
  const sockets = userSocketsMap.get(userId);
  return Boolean(sockets && sockets.size > 0);
}

export function getOnlineUserIds(): string[] {
  const online: string[] = [];
  userSocketsMap.forEach((sockets, userId) => {
    if (sockets.size > 0) online.push(userId);
  });
  return online;
}

function broadcastUserStatus(userId: string, isOnline: boolean) {
  const payload = JSON.stringify({
    type: 'chat:user_status',
    data: { userId, status: isOnline ? 'ONLINE' : 'OFFLINE' },
  });
  userSocketsMap.forEach(sockets => {
    sockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  });
}

function get24HourCutoffIso(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

export function initChatWebSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const reqUrl = request.url || '';
    if (reqUrl.startsWith('/ws/chat') || reqUrl.startsWith('/chat')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: AuthenticatedSocket, request) => {
    ws.isAlive = true;

    // Authenticate client via URL token query parameter
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    let token = url.searchParams.get('token') || '';

    if (token.startsWith('Bearer ')) {
      token = token.slice(7);
    }
    token = token.trim().replace(/^["']|["']$/g, '');

    if (!token) {
      console.warn('[WebSocket Auth Failed] Missing token query parameter.');
      ws.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
      ws.close(4001, 'Authentication token required');
      return;
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; email: string; role: string };
      ws.user = decoded;
    } catch (err) {
      console.warn('[WebSocket Auth Failed] Invalid or expired JWT token:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token' }));
      ws.close(4001, 'Invalid or expired token');
      return;
    }

    const userId = ws.user.userId;
    console.log(`[WebSocket Connected] User "${userId}" connected (${ws.user.role}).`);

    // Register user socket
    if (!userSocketsMap.has(userId)) {
      userSocketsMap.set(userId, new Set());
    }
    const userSockets = userSocketsMap.get(userId)!;
    const wasOffline = userSockets.size === 0;
    userSockets.add(ws);

    if (wasOffline) {
      broadcastUserStatus(userId, true);
    }

    // Send connection success & list of online users
    ws.send(JSON.stringify({
      type: 'chat:auth_success',
      data: {
        userId,
        onlineUsers: getOnlineUserIds(),
      },
    }));

    // Handle heartbeats
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Handle incoming messages
    ws.on('message', async (rawMessage: string) => {
      try {
        const payload: ChatMessagePayload = JSON.parse(rawMessage.toString());
        await handleSocketMessage(ws, payload);
      } catch (err) {
        console.error('[WebSocket Message Error] Failed to parse payload:', err);
        ws.send(JSON.stringify({ type: 'error', message: 'Malformed JSON message' }));
      }
    });

    // Handle connection close
    ws.on('close', () => {
      console.log(`[WebSocket Closed] User "${userId}" disconnected.`);
      const sockets = userSocketsMap.get(userId);
      if (sockets) {
        sockets.delete(ws);
        if (sockets.size === 0) {
          userSocketsMap.delete(userId);
          broadcastUserStatus(userId, false);
        }
      }
    });

    ws.on('error', (err) => {
      console.error(`[WebSocket Error] User "${userId}":`, err);
    });
  });

  // Heartbeat interval (30 seconds)
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: AuthenticatedSocket) => {
      if (ws.isAlive === false) {
        console.log(`[WebSocket Heartbeat] Terminating stale connection for user "${ws.user?.userId}"`);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  console.log('[WebSocket Server] Chat WebSocket server initialized on route /ws/chat');
  return wss;
}

async function handleSocketMessage(ws: AuthenticatedSocket, payload: ChatMessagePayload) {
  if (!ws.user) return;
  const senderId = ws.user.userId; // DERIVE sender identity ONLY from authenticated token!

  switch (payload.type) {
    case 'pong':
      ws.isAlive = true;
      break;

    case 'chat:send': {
      let { conversationId, receiverId, message, tempId } = payload;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        ws.send(JSON.stringify({ type: 'error', message: 'Message content cannot be empty' }));
        return;
      }

      if (message.length > 2000) {
        ws.send(JSON.stringify({ type: 'error', message: 'Message exceeds maximum length limit of 2000 characters' }));
        return;
      }

      if (!receiverId && !conversationId) {
        ws.send(JSON.stringify({ type: 'error', message: 'receiverId or conversationId required' }));
        return;
      }

      // If receiverId is provided, locate or create conversation
      if (!conversationId && receiverId) {
        conversationId = await findOrCreateConversation(senderId, receiverId);
      }

      if (!conversationId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Unable to establish conversation' }));
        return;
      }

      // Verify conversation exists & sender is participant
      const conversation = await db.find('conversations', { id: conversationId });
      if (!conversation) {
        ws.send(JSON.stringify({ type: 'error', message: 'Conversation not found' }));
        return;
      }

      const participants = await db.list('conversation_participants', { conversation_id: conversationId });
      const isParticipant = participants.some((p: any) => p.user_id === senderId || p.userid === senderId || p.userId === senderId);
      if (!isParticipant) {
        ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized: You are not a participant in this conversation' }));
        return;
      }

      // Determine receiverId if not passed in payload
      if (!receiverId) {
        const otherP = participants.find((p: any) => (p.user_id || p.userid || p.userId) !== senderId);
        receiverId = otherP?.user_id || otherP?.userid || otherP?.userId;
      }

      if (!receiverId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Receiver not found' }));
        return;
      }

      // Generate reliable server UTC timestamp
      const serverCreatedAt = new Date().toISOString();
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      const isReceiverOnline = isUserOnline(receiverId);
      const deliveredAt = isReceiverOnline ? serverCreatedAt : null;

      // Save message to Supabase / DB
      const messageRecord = await db.insert('messages', {
        id: messageId,
        conversationId,
        senderId,
        receiverId,
        message: message.trim(),
        messageType: payload.messageType || 'TEXT',
        createdAt: serverCreatedAt,
        deliveredAt,
        readAt: null,
      });

      // Update conversation updated_at
      await db.update('conversations', { id: conversationId }, { updated_at: serverCreatedAt });

      const formattedMsg = {
        id: messageRecord.id || messageId,
        conversationId,
        senderId,
        receiverId,
        message: message.trim(),
        messageType: payload.messageType || 'TEXT',
        createdAt: serverCreatedAt,
        deliveredAt,
        readAt: null,
        tempId,
        status: deliveredAt ? 'DELIVERED' : 'SENT',
      };

      // 1. Send acknowledgement back to sender
      ws.send(JSON.stringify({
        type: 'chat:ack',
        data: formattedMsg,
      }));

      // 2. Deliver real-time message to receiver if connected
      if (isReceiverOnline) {
        const receiverSockets = userSocketsMap.get(receiverId);
        if (receiverSockets) {
          const receiverPayload = JSON.stringify({
            type: 'chat:message',
            data: formattedMsg,
          });
          receiverSockets.forEach(rWs => {
            if (rWs.readyState === WebSocket.OPEN) {
              rWs.send(receiverPayload);
            }
          });
        }
      }
      break;
    }

    case 'chat:read': {
      const { conversationId, messageIds } = payload;
      if (!conversationId) return;

      const readAt = new Date().toISOString();
      const cutoffIso = get24HourCutoffIso();

      let targetIds = messageIds;
      if (!targetIds || targetIds.length === 0) {
        const unreadMsgs = await db.list('messages', { conversation_id: conversationId, receiver_id: senderId });
        targetIds = unreadMsgs
          .filter((m: any) => !m.read_at && !m.readAt && new Date(m.created_at || m.createdAt).getTime() >= new Date(cutoffIso).getTime())
          .map((m: any) => m.id);
      }

      if (targetIds && targetIds.length > 0) {
        for (const mId of targetIds) {
          await db.update('messages', { id: mId }, { read_at: readAt });
        }

        // Notify other participants in the conversation
        const participants = await db.list('conversation_participants', { conversation_id: conversationId });
        const readNotification = JSON.stringify({
          type: 'chat:read',
          data: {
            conversationId,
            messageIds: targetIds,
            readAt,
            readerId: senderId,
          },
        });

        participants.forEach((p: any) => {
          const pUserId = p.user_id || p.userid;
          if (pUserId !== senderId) {
            const pSockets = userSocketsMap.get(pUserId);
            if (pSockets) {
              pSockets.forEach(pWs => {
                if (pWs.readyState === WebSocket.OPEN) {
                  pWs.send(readNotification);
                }
              });
            }
          }
        });
      }
      break;
    }

    case 'chat:typing': {
      const { conversationId, receiverId, isTyping } = payload;
      if (!conversationId || !receiverId) return;

      const receiverSockets = userSocketsMap.get(receiverId);
      if (receiverSockets) {
        const typingNotification = JSON.stringify({
          type: 'chat:typing',
          data: {
            conversationId,
            senderId,
            isTyping: Boolean(isTyping),
          },
        });
        receiverSockets.forEach(rWs => {
          if (rWs.readyState === WebSocket.OPEN) {
            rWs.send(typingNotification);
          }
        });
      }
      break;
    }

    default:
      console.warn(`[WebSocket Message] Unrecognized message type: "${payload.type}"`);
      break;
  }
}

export async function findOrCreateConversation(userIdA: string, userIdB: string): Promise<string> {
  const allParticipants = await db.list('conversation_participants');
  
  // Group by conversation_id
  const userConvsMap = new Map<string, Set<string>>();
  allParticipants.forEach((p: any) => {
    const cId = p.conversation_id || p.conversationid || p.conversationId;
    const uId = p.user_id || p.userid || p.userId;
    if (cId && uId) {
      if (!userConvsMap.has(cId)) userConvsMap.set(cId, new Set());
      userConvsMap.get(cId)!.add(uId);
    }
  });

  for (const [cId, uSet] of userConvsMap.entries()) {
    if (uSet.size === 2 && uSet.has(userIdA) && uSet.has(userIdB)) {
      return cId;
    }
  }

  // Create new conversation
  const newConvId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const nowIso = new Date().toISOString();
  await db.insert('conversations', { id: newConvId, createdAt: nowIso, updatedAt: nowIso });
  await db.insert('conversation_participants', { conversationId: newConvId, userId: userIdA, joinedAt: nowIso });
  await db.insert('conversation_participants', { conversationId: newConvId, userId: userIdB, joinedAt: nowIso });

  return newConvId;
}
