import { Router } from 'express';
import { db } from '../../config/database';
import { authenticate, getTrustedOrgId } from '../../middleware/auth';
import { fail, ok, publicUser } from '../../utils/http';
import { findOrCreateConversation, isUserOnline, broadcastRealtimeMessage, broadcastRealtimeRead } from './websocket';

export const chatRouter = Router();

// Apply JWT authentication middleware to all chat routes
chatRouter.use(authenticate);

function get24HourCutoffIso(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

/**
 * GET /api/chat/users
 * Returns roster of users available for 1-on-1 chat based on RBAC permissions and organization isolation.
 */
chatRouter.get('/users', async (req, res) => {
  const currentUserId = req.user!.userId;
  const currentRole = req.user!.role || '';
  const orgId = getTrustedOrgId(req);

  const rawUsers = await db.list('users', orgId ? { organization_id: orgId } : undefined);
  const allUsers = rawUsers.map((u: any) => publicUser(u));

  const isDriverRole = (r: string) => r === 'DRIVER' || r === 'ROLE_DRIVER';

  const filteredUsers = allUsers.filter((u: any) => {
    const userId = u.id || u.userID || u.driverID;
    if (!userId || userId === currentUserId) return false;

    const role = u.role || '';
    if (isDriverRole(currentRole)) {
      return !isDriverRole(role);
    }
    return true;
  });

  const roster = filteredUsers.map((u: any) => {
    const userId = u.id || u.userID || u.driverID;
    return {
      id: userId,
      name: u.name || 'User',
      email: u.email || '',
      role: u.role || 'USER',
      phoneNo: u.phoneNo || u.phoneno || null,
      isOnline: isUserOnline(userId),
    };
  });

  return ok(res, roster);
});

/**
 * GET /api/chat/conversations
 * Returns active conversations for current user with 24-hour retention filter for last message & unread counts.
 */
chatRouter.get('/conversations', async (req, res) => {
  const currentUserId = req.user!.userId;
  const cutoffIso = get24HourCutoffIso();

  const allParticipants = await db.list('conversation_participants');
  const userConvIds = Array.from(
    new Set(
      allParticipants
        .filter((p: any) => (p.user_id || p.userid || p.userId) === currentUserId)
        .map((p: any) => p.conversation_id || p.conversationid || p.conversationId)
        .filter(Boolean)
    )
  );

  const resultConversations: any[] = [];

  for (const convId of userConvIds) {
    const conv = await db.find('conversations', { id: convId });
    if (!conv) continue;

    // Find other participant
    const convParts = allParticipants.filter((p: any) => (p.conversation_id || p.conversationid || p.conversationId) === convId);
    const otherPart = convParts.find((p: any) => (p.user_id || p.userid || p.userId) !== currentUserId);
    if (!otherPart) continue;

    const otherUserId = otherPart.user_id || otherPart.userid || otherPart.userId;
    const otherUser = await db.find('users', { id: otherUserId });

    // Fetch messages for conversation
    const rawMessages = await db.list('messages', { conversation_id: convId });
    
    // Filter messages strictly created within last 24 hours
    const validMessages = rawMessages.filter((m: any) => {
      const created = m.created_at || m.createdAt;
      return created && new Date(created).getTime() >= new Date(cutoffIso).getTime();
    });

    // Deduplicate messages by message id
    const seenMsgIds = new Set<string>();
    const uniqueMessages = validMessages.filter((m: any) => {
      const mId = m.id;
      if (mId && seenMsgIds.has(mId)) return false;
      if (mId) seenMsgIds.add(mId);
      return true;
    });

    // Sort by created_at desc
    uniqueMessages.sort((a: any, b: any) => {
      return new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime();
    });

    const lastMsg = uniqueMessages[0] ? {
      id: uniqueMessages[0].id,
      message: uniqueMessages[0].message,
      senderId: uniqueMessages[0].sender_id || uniqueMessages[0].senderId,
      receiverId: uniqueMessages[0].receiver_id || uniqueMessages[0].receiverId,
      createdAt: uniqueMessages[0].created_at || uniqueMessages[0].createdAt,
    } : null;

    // Calculate unread count strictly for messages within last 24h
    const unreadCount = uniqueMessages.filter((m: any) => {
      const recId = m.receiver_id || m.receiverId;
      const readAt = m.read_at || m.readAt;
      return recId === currentUserId && !readAt;
    }).length;

    resultConversations.push({
      id: convId,
      createdAt: conv.created_at || conv.createdAt,
      updatedAt: conv.updated_at || conv.updatedAt,
      participant: {
        id: otherUser ? otherUser.id : otherUserId,
        name: otherUser ? otherUser.name : 'User',
        email: otherUser ? otherUser.email : '',
        role: otherUser ? otherUser.role : 'USER',
        isOnline: isUserOnline(otherUserId),
      },
      lastMessage: lastMsg,
      unreadCount,
    });
  }

  // Deduplicate conversations by participant: if multiple exist, retain the one with latest message / updated time
  const participantConvsMap = new Map<string, any>();
  for (const c of resultConversations) {
    const partId = c.participant?.id;
    if (!partId) continue;
    if (!participantConvsMap.has(partId)) {
      participantConvsMap.set(partId, c);
    } else {
      const existing = participantConvsMap.get(partId);
      const timeExisting = existing.lastMessage?.createdAt || existing.updatedAt || existing.createdAt;
      const timeCurrent = c.lastMessage?.createdAt || c.updatedAt || c.createdAt;
      if (new Date(timeCurrent).getTime() > new Date(timeExisting).getTime()) {
        participantConvsMap.set(partId, c);
      }
    }
  }
  const deduplicatedConversations = Array.from(participantConvsMap.values());

  // Sort conversations by updatedAt / last message time desc safely
  deduplicatedConversations.sort((a, b) => {
    const timeA = a.lastMessage?.createdAt || a.updatedAt || a.createdAt;
    const timeB = b.lastMessage?.createdAt || b.updatedAt || b.createdAt;
    const numA = timeA ? new Date(timeA).getTime() || 0 : 0;
    const numB = timeB ? new Date(timeB).getTime() || 0 : 0;
    return numB - numA;
  });

  return ok(res, deduplicatedConversations);
});

/**
 * POST /api/chat/conversations
 * Get or create 1-on-1 conversation between current user and target participant.
 */
chatRouter.post('/conversations', async (req, res) => {
  const currentUserId = req.user!.userId;
  const { participantId } = req.body;

  if (!participantId || typeof participantId !== 'string') {
    return fail(res, 400, 'participantId is required');
  }

  if (participantId === currentUserId) {
    return fail(res, 400, 'Cannot create a conversation with yourself');
  }

  let rawTargetUser = await db.find('users', { id: participantId });
  if (!rawTargetUser) {
    rawTargetUser = await db.find('users', { userid: participantId });
  }
  if (!rawTargetUser) {
    return fail(res, 404, 'Participant user not found');
  }
  const orgId = getTrustedOrgId(req);
  const targetOrg = rawTargetUser.organization_id || rawTargetUser.businessId || rawTargetUser.business_id;
  if (targetOrg && targetOrg !== orgId) {
    return fail(res, 404, 'Participant user not found');
  }
  const targetUser = publicUser(rawTargetUser);

  const isDriverRole = (r: string) => r === 'DRIVER' || r === 'ROLE_DRIVER';

  // RBAC check
  if (isDriverRole(req.user!.role || '') && isDriverRole(targetUser.role || '')) {
    return fail(res, 403, 'Drivers are not authorized to initiate direct chat with other drivers');
  }

  const convId = await findOrCreateConversation(currentUserId, participantId);
  const conv = await db.find('conversations', { id: convId });

  return ok(res, {
    id: convId,
    createdAt: conv?.created_at || conv?.createdAt || new Date().toISOString(),
    participant: {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      isOnline: isUserOnline(targetUser.id),
    },
  });
});

/**
 * GET /api/chat/conversations/:conversationId/messages
 * Get paginated message history for a conversation, strictly enforcing 24-hour retention.
 */
chatRouter.get('/conversations/:conversationId/messages', async (req, res) => {
  const currentUserId = req.user!.userId;
  const { conversationId } = req.params;

  // Validate participation
  const participants = await db.list('conversation_participants', { conversation_id: conversationId });
  const isParticipant = participants.some((p: any) => (p.user_id || p.userid || p.userId) === currentUserId);
  if (!isParticipant) {
    return fail(res, 403, 'Access denied: You are not a participant in this conversation');
  }

  const cutoffIso = get24HourCutoffIso();
  const rawMessages = await db.list('messages', { conversation_id: conversationId });

  // Filter messages strictly within last 24 hours
  const filteredMessages = rawMessages.filter((m: any) => {
    const created = m.created_at || m.createdAt;
    return created && new Date(created).getTime() >= new Date(cutoffIso).getTime();
  });

  // Deduplicate by message ID
  const seenMsgIds = new Set<string>();
  const uniqueMessages = filteredMessages.filter((m: any) => {
    const mId = m.id;
    if (mId && seenMsgIds.has(mId)) return false;
    if (mId) seenMsgIds.add(mId);
    return true;
  });

  // Sort ascending by creation time for chat view
  uniqueMessages.sort((a: any, b: any) => {
    return new Date(a.created_at || a.createdAt).getTime() - new Date(b.created_at || b.createdAt).getTime();
  });

  // Pagination support
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

  const paginated = uniqueMessages.slice(offset, offset + limit).map((m: any) => ({
    id: m.id,
    conversationId: m.conversation_id || m.conversationId,
    senderId: m.sender_id || m.senderId,
    receiverId: m.receiver_id || m.receiverId,
    message: m.message,
    messageType: m.message_type || m.messageType || 'TEXT',
    createdAt: m.created_at || m.createdAt,
    deliveredAt: m.delivered_at || m.deliveredAt || null,
    readAt: m.read_at || m.readAt || null,
    status: m.read_at || m.readAt ? 'READ' : (m.delivered_at || m.deliveredAt ? 'DELIVERED' : 'SENT'),
  }));

  return ok(res, {
    messages: paginated,
    total: filteredMessages.length,
    limit,
    offset,
  });
});

/**
 * POST /api/chat/conversations/:conversationId/messages
 * Send a message via REST API with database persistence and real-time WebSocket broadcast.
 */
chatRouter.post('/conversations/:conversationId/messages', async (req, res) => {
  const currentUserId = req.user!.userId;
  const { conversationId } = req.params;
  const { message, messageType, tempId } = req.body ?? {};

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return fail(res, 400, 'Message content cannot be empty');
  }

  if (message.length > 2000) {
    return fail(res, 400, 'Message exceeds maximum length limit of 2000 characters');
  }

  // Verify conversation exists & sender is participant
  const conversation = await db.find('conversations', { id: conversationId });
  if (!conversation) {
    return fail(res, 404, 'Conversation not found');
  }

  const participants = await db.list('conversation_participants', { conversation_id: conversationId });
  const isParticipant = participants.some((p: any) => (p.user_id || p.userid || p.userId) === currentUserId);
  if (!isParticipant) {
    return fail(res, 403, 'Unauthorized: You are not a participant in this conversation');
  }

  let receiverId = req.body?.receiverId;
  if (!receiverId) {
    const otherP = participants.find((p: any) => (p.user_id || p.userid || p.userId) !== currentUserId);
    receiverId = otherP?.user_id || otherP?.userid || otherP?.userId;
  }

  if (!receiverId) {
    return fail(res, 400, 'Receiver not found');
  }

  const serverCreatedAt = new Date().toISOString();
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const isReceiverOnline = isUserOnline(receiverId);
  const deliveredAt = isReceiverOnline ? serverCreatedAt : null;

  const orgId = getTrustedOrgId(req);
  const messageRecord = await db.insert('messages', {
    id: messageId,
    conversationId,
    conversation_id: conversationId,
    organization_id: orgId,
    senderId: currentUserId,
    sender_id: currentUserId,
    receiverId,
    receiver_id: receiverId,
    message: message.trim(),
    messageType: messageType || 'TEXT',
    message_type: messageType || 'TEXT',
    createdAt: serverCreatedAt,
    created_at: serverCreatedAt,
    deliveredAt,
    delivered_at: deliveredAt,
    readAt: null,
    read_at: null,
  });

  await db.update('conversations', { id: conversationId }, { updated_at: serverCreatedAt, updatedAt: serverCreatedAt });

  const formattedMsg = {
    id: messageRecord.id || messageId,
    conversationId,
    senderId: currentUserId,
    receiverId,
    message: message.trim(),
    messageType: messageType || 'TEXT',
    createdAt: serverCreatedAt,
    deliveredAt,
    readAt: null,
    tempId,
    status: deliveredAt ? 'DELIVERED' : 'SENT',
  };

  // Broadcast real-time event to connected participants
  broadcastRealtimeMessage(conversationId, formattedMsg, currentUserId, receiverId);

  return res.status(201).json({
    success: true,
    data: formattedMsg,
  });
});

/**
 * POST /api/chat/conversations/:conversationId/read
 * Mark all incoming messages in conversation as read via REST API with real-time broadcast.
 */
chatRouter.post('/conversations/:conversationId/read', async (req, res) => {
  const currentUserId = req.user!.userId;
  const { conversationId } = req.params;

  const participants = await db.list('conversation_participants', { conversation_id: conversationId });
  const isParticipant = participants.some((p: any) => (p.user_id || p.userid || p.userId) === currentUserId);
  if (!isParticipant) {
    return fail(res, 403, 'Unauthorized: You are not a participant in this conversation');
  }

  const readAt = new Date().toISOString();
  const cutoffIso = get24HourCutoffIso();

  const unreadMsgs = await db.list('messages', { conversation_id: conversationId, receiver_id: currentUserId });
  const targetIds = unreadMsgs
    .filter((m: any) => !m.read_at && !m.readAt && new Date(m.created_at || m.createdAt).getTime() >= new Date(cutoffIso).getTime())
    .map((m: any) => m.id);

  if (targetIds.length > 0) {
    for (const mId of targetIds) {
      await db.update('messages', { id: mId }, { read_at: readAt, readAt });
    }
  }

  await broadcastRealtimeRead(conversationId, targetIds, currentUserId, readAt);

  return ok(res, {
    conversationId,
    readAt,
    count: targetIds.length,
    readCount: targetIds.length,
  });
});
