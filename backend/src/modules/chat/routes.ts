import { Router } from 'express';
import { db } from '../../config/database';
import { authenticate } from '../../middleware/auth';
import { fail, ok, publicUser } from '../../utils/http';
import { findOrCreateConversation, isUserOnline } from './websocket';

export const chatRouter = Router();

// Apply JWT authentication middleware to all chat routes
chatRouter.use(authenticate);

function get24HourCutoffIso(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

/**
 * GET /api/chat/users
 * Returns roster of users available for 1-on-1 chat based on RBAC permissions.
 */
chatRouter.get('/users', async (req, res) => {
  const currentUserId = req.user!.userId;
  const currentRole = req.user!.role || '';

  const rawUsers = await db.list('users');
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
  const userConvIds = allParticipants
    .filter((p: any) => (p.user_id || p.userid || p.userId) === currentUserId)
    .map((p: any) => p.conversation_id || p.conversationid || p.conversationId);

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

    // Sort by created_at desc
    validMessages.sort((a: any, b: any) => {
      return new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime();
    });

    const lastMsg = validMessages[0] ? {
      id: validMessages[0].id,
      message: validMessages[0].message,
      senderId: validMessages[0].sender_id || validMessages[0].senderId,
      receiverId: validMessages[0].receiver_id || validMessages[0].receiverId,
      createdAt: validMessages[0].created_at || validMessages[0].createdAt,
    } : null;

    // Calculate unread count strictly for messages within last 24h
    const unreadCount = validMessages.filter((m: any) => {
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

  // Sort conversations by updatedAt / last message time desc safely
  resultConversations.sort((a, b) => {
    const timeA = a.lastMessage?.createdAt || a.updatedAt || a.createdAt;
    const timeB = b.lastMessage?.createdAt || b.updatedAt || b.createdAt;
    const numA = timeA ? new Date(timeA).getTime() || 0 : 0;
    const numB = timeB ? new Date(timeB).getTime() || 0 : 0;
    return numB - numA;
  });

  return ok(res, resultConversations);
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

  // Sort ascending by creation time for chat view
  filteredMessages.sort((a: any, b: any) => {
    return new Date(a.created_at || a.createdAt).getTime() - new Date(b.created_at || b.createdAt).getTime();
  });

  // Pagination support
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

  const paginated = filteredMessages.slice(offset, offset + limit).map((m: any) => ({
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
