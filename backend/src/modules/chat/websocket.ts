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
    businessId?: string;
    business_id?: string;
    organizationId?: string;
    organization_id?: string;
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

function broadcastUserStatus(userId: string, isOnline: boolean, orgId?: string) {
  const payload = JSON.stringify({
    type: 'chat:user_status',
    data: { userId, status: isOnline ? 'ONLINE' : 'OFFLINE' },
  });
  userSocketsMap.forEach(sockets => {
    sockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        const userOrg = ws.user?.organizationId || ws.user?.organization_id || ws.user?.businessId || ws.user?.business_id;
        if (!orgId || !userOrg || orgId === userOrg) {
          ws.send(payload);
        }
      }
    });
  });
}

export function broadcastTrackingLocation(locationPayload: any) {
  const payload = JSON.stringify({
    type: 'tracking:location_update',
    data: locationPayload,
  });
  const locOrg = locationPayload.organization_id || locationPayload.organizationId || locationPayload.businessId || locationPayload.business_id;

  userSocketsMap.forEach((sockets) => {
    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Send to managers, dispatchers, or connected tracking clients of the same organization
        const role = ws.user?.role || '';
        const userOrg = ws.user?.organizationId || ws.user?.organization_id || ws.user?.businessId || ws.user?.business_id;
        const orgMatch = !locOrg || !userOrg || locOrg === userOrg;
        if (
          orgMatch && (
            !ws.user ||
            ['ROLE_MANAGER', 'ROLE_DISPATCHER', 'MANAGER', 'DISPATCHER'].includes(role) ||
            ws.user.userId === locationPayload.driverID
          )
        ) {
          ws.send(payload);
        }
      }
    });
  });
}

export function broadcastTrackingTripEnded(tripID: string, orgId?: string) {
  const payload = JSON.stringify({
    type: 'tracking:trip_ended',
    data: { tripID },
  });
  userSocketsMap.forEach((sockets) => {
    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        const role = ws.user?.role || '';
        const userOrg = ws.user?.organizationId || ws.user?.organization_id || ws.user?.businessId || ws.user?.business_id;
        const orgMatch = !orgId || !userOrg || orgId === userOrg;
        if (
          orgMatch && (
            !ws.user ||
            ['ROLE_MANAGER', 'ROLE_DISPATCHER', 'MANAGER', 'DISPATCHER'].includes(role)
          )
        ) {
          ws.send(payload);
        }
      }
    });
  });
}

export function broadcastEmergencyAlertCreated(alert: any) {
  const payload = JSON.stringify({
    type: 'alert:emergency_created',
    data: alert,
  });
  console.log(`[WebSocket Broadcast] Emergency alert created (${alert.id}), broadcasting to authorized managers & driver.`);
  const alertOrg = alert.organization_id || alert.organizationId || alert.businessId || alert.business_id || 'default_org';
  const alertDriverId = alert.driverId || alert.driver_id;

  userSocketsMap.forEach((sockets) => {
    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        const role = String(ws.user?.role || '').toUpperCase();
        const isManager = ['ROLE_MANAGER', 'FLEET_MANAGER', 'ROLE_ADMIN', 'ADMIN', 'ROLE_DISPATCHER', 'DISPATCHER', 'MANAGER'].includes(role);
        const isDriverOwner = String(ws.user?.userId || '').toLowerCase() === String(alertDriverId || '').toLowerCase();
        const managerOrg = ws.user?.organizationId || ws.user?.organization_id || ws.user?.businessId || ws.user?.business_id || 'default_org';
        const orgMatch = !alertOrg || !managerOrg || String(managerOrg).toLowerCase() === String(alertOrg).toLowerCase();

        if ((isManager && orgMatch) || isDriverOwner) {
          ws.send(payload);
        }
      }
    });
  });
}

export function broadcastEmergencyAlertUpdated(alert: any) {
  const payload = JSON.stringify({
    type: 'alert:emergency_updated',
    data: alert,
  });
  console.log(`[WebSocket Broadcast] Emergency alert updated (${alert.id}), broadcasting status update.`);
  const alertOrg = alert.organization_id || alert.organizationId || alert.businessId || alert.business_id || 'default_org';
  const alertDriverId = alert.driverId || alert.driver_id;

  userSocketsMap.forEach((sockets) => {
    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        const role = String(ws.user?.role || '').toUpperCase();
        const isManager = ['ROLE_MANAGER', 'FLEET_MANAGER', 'ROLE_ADMIN', 'ADMIN', 'ROLE_DISPATCHER', 'DISPATCHER', 'MANAGER'].includes(role);
        const isDriverOwner = String(ws.user?.userId || '').toLowerCase() === String(alertDriverId || '').toLowerCase();
        const managerOrg = ws.user?.organizationId || ws.user?.organization_id || ws.user?.businessId || ws.user?.business_id || 'default_org';
        const orgMatch = !alertOrg || !managerOrg || String(managerOrg).toLowerCase() === String(alertOrg).toLowerCase();

        if ((isManager && orgMatch) || isDriverOwner) {
          ws.send(payload);
        }
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
    const parsedPath = reqUrl.split('?')[0].replace(/\/+$/, '');
    if (
      parsedPath === '/ws/chat' ||
      parsedPath === '/chat' ||
      parsedPath === '/api/chat/ws' ||
      parsedPath === '/ws' ||
      parsedPath === '/ws/tracking' ||
      parsedPath === '/tracking' ||
      parsedPath === '/api/tracking/ws' ||
      parsedPath === '/ws/alerts' ||
      parsedPath === '/alerts' ||
      parsedPath === '/api/alerts/ws'
    ) {
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
      const decoded: any = jwt.verify(token, env.JWT_SECRET);
      const orgId = decoded.organizationId || decoded.organization_id || decoded.businessId || decoded.business_id || '00000000-0000-0000-0000-000000000001';
      ws.user = {
        ...decoded,
        userId: decoded.userId || decoded.id,
        organizationId: orgId,
        organization_id: orgId,
        businessId: orgId,
        business_id: orgId,
      };
    } catch (err) {
      console.warn('[WebSocket Auth Failed] Invalid or expired JWT token:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token' }));
      ws.close(4001, 'Invalid or expired token');
      return;
    }

    if (!ws.user) return;
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
      broadcastUserStatus(userId, true, ws.user.organizationId);
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
        ws.isAlive = true;
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
  ws.isAlive = true;

  switch (payload.type) {
    case 'ping':
      ws.isAlive = true;
      ws.send(JSON.stringify({ type: 'pong' }));
      break;

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
        const wsOrg = ws.user?.organizationId || ws.user?.organization_id || ws.user?.businessId || ws.user?.business_id;
        conversationId = await findOrCreateConversation(senderId, receiverId, wsOrg);
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

      // Save message to Supabase / DB with organization_id
      const msgOrgId = conversation.organization_id || conversation.organizationId || ws.user?.organizationId || ws.user?.organization_id || '805c901d-5038-462c-9f87-4857d7afed10';
      const messageRecord = await db.insert('messages', {
        id: messageId,
        organization_id: msgOrgId,
        organizationId: msgOrgId,
        conversationId,
        conversation_id: conversationId,
        senderId,
        sender_id: senderId,
        receiverId,
        receiver_id: receiverId,
        message: message.trim(),
        messageType: payload.messageType || 'TEXT',
        message_type: payload.messageType || 'TEXT',
        createdAt: serverCreatedAt,
        created_at: serverCreatedAt,
        deliveredAt,
        delivered_at: deliveredAt,
        readAt: null,
        read_at: null,
      });

      // Update conversation updated_at
      await db.update('conversations', { id: conversationId }, { updated_at: serverCreatedAt });

      const senderName = (ws.user as any)?.name || ws.user?.email || 'User';

      const formattedMsg = {
        id: messageRecord.id || messageId,
        conversationId,
        senderId,
        senderName,
        receiverId,
        message: message.trim(),
        messageType: payload.messageType || 'TEXT',
        createdAt: serverCreatedAt,
        deliveredAt,
        readAt: null,
        tempId,
        status: deliveredAt ? 'DELIVERED' : 'SENT',
      };

      // Broadcast real-time message to sender and receiver
      broadcastRealtimeMessage(conversationId, formattedMsg, senderId, receiverId, ws);
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
          await db.update('messages', { id: mId }, { read_at: readAt, readAt });
        }
      }

      await broadcastRealtimeRead(conversationId, targetIds || [], senderId, readAt);
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

export function broadcastRealtimeMessage(
  conversationId: string,
  formattedMsg: any,
  senderId: string,
  receiverId: string,
  sendingWs?: AuthenticatedSocket
) {
  const isReceiverOnline = isUserOnline(receiverId);

  // 1. Send acknowledgement to the sending socket
  if (sendingWs && sendingWs.readyState === WebSocket.OPEN) {
    sendingWs.send(JSON.stringify({
      type: 'chat:ack',
      data: formattedMsg,
    }));
  }

  // 1b. Deliver to any other sockets of senderId (multi-device/multi-session sync)
  const senderSockets = userSocketsMap.get(senderId);
  if (senderSockets) {
    const senderPayload = JSON.stringify({
      type: 'chat:ack',
      data: formattedMsg,
    });
    senderSockets.forEach((sWs) => {
      if (sWs !== sendingWs && sWs.readyState === WebSocket.OPEN) {
        sWs.send(senderPayload);
      }
    });
  }

  // 2. Deliver real-time message to receiver sockets
  const receiverSockets = userSocketsMap.get(receiverId);
  if (receiverSockets && receiverSockets.size > 0) {
    formattedMsg.status = 'DELIVERED';
    formattedMsg.deliveredAt = formattedMsg.deliveredAt || new Date().toISOString();

    const receiverPayload = JSON.stringify({
      type: 'chat:message',
      data: formattedMsg,
    });
    receiverSockets.forEach((rWs) => {
      if (rWs.readyState === WebSocket.OPEN) {
        rWs.send(receiverPayload);
      }
    });

    // Notify sender that message was delivered
    const deliveredPayload = JSON.stringify({
      type: 'chat:delivered',
      data: {
        messageId: formattedMsg.id,
        conversationId,
        deliveredAt: formattedMsg.deliveredAt,
      },
    });
    if (senderSockets) {
      senderSockets.forEach((sWs) => {
        if (sWs.readyState === WebSocket.OPEN) {
          sWs.send(deliveredPayload);
        }
      });
    }
  }
}

export async function broadcastRealtimeRead(
  conversationId: string,
  targetIds: string[],
  readerId: string,
  readAt: string
) {
  const participants = await db.list('conversation_participants', { conversation_id: conversationId });
  const readNotification = JSON.stringify({
    type: 'chat:read',
    data: {
      conversationId,
      messageIds: targetIds,
      readAt,
      readerId,
    },
  });

  // Broadcast to other participants in conversation (e.g. sender)
  participants.forEach((p: any) => {
    const pUserId = p.user_id || p.userid || p.userId;
    if (pUserId && pUserId !== readerId) {
      const pSockets = userSocketsMap.get(pUserId);
      if (pSockets) {
        pSockets.forEach((pWs) => {
          if (pWs.readyState === WebSocket.OPEN) {
            pWs.send(readNotification);
          }
        });
      }
    }
  });

  // Also broadcast to reader's OTHER sockets so multi-device/multi-session unread counters sync immediately
  const readerSockets = userSocketsMap.get(readerId);
  if (readerSockets) {
    readerSockets.forEach((rWs) => {
      if (rWs.readyState === WebSocket.OPEN) {
        rWs.send(readNotification);
      }
    });
  }
}

export async function findOrCreateConversation(userIdA: string, userIdB: string, explicitOrgId?: string): Promise<string> {
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

  // Resolve tenant organization_id for the conversation
  let orgId = explicitOrgId;
  const isUuid = (v: any) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  if (!orgId || !isUuid(orgId)) {
    const userA = await db.find('users', { id: userIdA });
    const userB = await db.find('users', { id: userIdB });
    const candidate = userA?.organization_id || userA?.organizationId || userB?.organization_id || userB?.organizationId;
    if (isUuid(candidate)) {
      orgId = candidate;
    } else {
      // Look up membership
      const memA = await db.find('organization_memberships', { user_id: userIdA });
      const memB = await db.find('organization_memberships', { user_id: userIdB });
      orgId = memA?.organization_id || memB?.organization_id || '805c901d-5038-462c-9f87-4857d7afed10';
    }
  }

  // Create new conversation
  const newConvId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const nowIso = new Date().toISOString();
  await db.insert('conversations', {
    id: newConvId,
    organization_id: orgId,
    organizationId: orgId,
    created_at: nowIso,
    createdAt: nowIso,
    updated_at: nowIso,
    updatedAt: nowIso,
  });
  await db.insert('conversation_participants', {
    conversation_id: newConvId,
    conversationId: newConvId,
    user_id: userIdA,
    userId: userIdA,
    joined_at: nowIso,
    joinedAt: nowIso,
  });
  await db.insert('conversation_participants', {
    conversation_id: newConvId,
    conversationId: newConvId,
    user_id: userIdB,
    userId: userIdB,
    joined_at: nowIso,
    joinedAt: nowIso,
  });

  return newConvId;
}
