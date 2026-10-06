import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import http from 'http';
import WebSocket from 'ws';
import { app } from '../src/app';
import { db } from '../src/config/database';
import { signToken } from '../src/middleware/auth';
import { initChatWebSocket } from '../src/modules/chat/websocket';
import { runChatRetentionCleanup } from '../src/modules/chat/cleanup';

describe('Real-Time Chat & 24-Hour Retention Module Flow', { timeout: 15000 }, () => {
  let server: http.Server;
  let port: number;

  const managerUser = {
    id: `usr-mgr-${Date.now()}`,
    name: 'Test Fleet Manager',
    email: `manager-${Date.now()}@logisphere.ai`,
    passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
    role: 'FLEET_MANAGER',
  };

  const driverUser = {
    id: `usr-drv-${Date.now()}`,
    name: 'Test Driver',
    email: `driver-${Date.now()}@logisphere.ai`,
    passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
    role: 'DRIVER',
  };

  let managerToken: string;
  let driverToken: string;
  let testConvId: string;

  beforeAll(async () => {
    await db.insert('users', managerUser);
    await db.insert('users', driverUser);

    managerToken = signToken(managerUser);
    driverToken = signToken(driverUser);

    // Create HTTP server on dynamic port
    server = http.createServer(app);
    initChatWebSocket(server);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr) {
          port = addr.port;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise((res) => server.close(res));
    }
  });

  it('1. Rejects unauthenticated requests to chat endpoints', async () => {
    const res = await request(app).get('/api/chat/conversations');
    expect(res.status).toBe(401);
  });

  it('2. Retrieves user roster for Fleet Manager (GET /api/chat/users)', async () => {
    const res = await request(app)
      .get('/api/chat/users')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const foundDriver = res.body.data.find((u: any) => u.id === driverUser.id);
    expect(foundDriver).toBeDefined();
    expect(foundDriver.role).toBe('DRIVER');
  });

  it('3. Initiates 1-on-1 conversation between Fleet Manager and Driver', async () => {
    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ participantId: driverUser.id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.participant.id).toBe(driverUser.id);

    testConvId = res.body.data.id;
  });

  it('4. Real-Time WebSocket send, receive, deliver & read flow with JWT auth', async () => {
    const driverWsUrl = `ws://localhost:${port}/ws/chat?token=${driverToken}`;
    const managerWsUrl = `ws://localhost:${port}/ws/chat?token=${managerToken}`;

    const driverWs = new WebSocket(driverWsUrl);
    const managerWs = new WebSocket(managerWsUrl);

    await Promise.all([
      new Promise((res) => driverWs.on('open', res)),
      new Promise((res) => managerWs.on('open', res)),
    ]);

    // Driver listens for incoming real-time message
    const driverReceivedPromise = new Promise<any>((resolve) => {
      driverWs.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'chat:message') {
          resolve(msg.data);
        }
      });
    });

    // Manager listens for acknowledgment
    const managerAckPromise = new Promise<any>((resolve) => {
      managerWs.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'chat:ack') {
          resolve(msg.data);
        }
      });
    });

    // Manager sends message over WebSocket
    const testText = 'Hello Driver, please proceed to destination.';
    managerWs.send(
      JSON.stringify({
        type: 'chat:send',
        conversationId: testConvId,
        receiverId: driverUser.id,
        message: testText,
      })
    );

    const ackData = await managerAckPromise;
    expect(ackData.conversationId).toBe(testConvId);
    expect(ackData.senderId).toBe(managerUser.id);
    expect(ackData.message).toBe(testText);
    expect(ackData.createdAt).toBeDefined();

    const receivedData = await driverReceivedPromise;
    expect(receivedData.message).toBe(testText);
    expect(receivedData.senderId).toBe(managerUser.id);
    expect(receivedData.receiverId).toBe(driverUser.id);
    expect(receivedData.status).toBe('DELIVERED');

    driverWs.close();
    managerWs.close();
  });

  it('5. Enforces strict 24-Hour retention filtering in REST APIs', async () => {
    // Insert a message created 1 hour ago (Valid)
    const validTime = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    const validMsg = await db.insert('messages', {
      id: `msg-valid-${Date.now()}`,
      conversationId: testConvId,
      senderId: managerUser.id,
      receiverId: driverUser.id,
      message: 'Valid message within 24h',
      createdAt: validTime,
    });

    // Insert a message created 26 hours ago (Expired)
    const expiredTime = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
    await db.insert('messages', {
      id: `msg-expired-${Date.now()}`,
      conversationId: testConvId,
      senderId: managerUser.id,
      receiverId: driverUser.id,
      message: 'Expired message older than 24h',
      createdAt: expiredTime,
    });

    // Fetch message history API
    const resHistory = await request(app)
      .get(`/api/chat/conversations/${testConvId}/messages`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(resHistory.status).toBe(200);
    const msgs = resHistory.body.data.messages;
    
    // Expired message must NOT be returned!
    const foundExpired = msgs.find((m: any) => m.message === 'Expired message older than 24h');
    expect(foundExpired).toBeUndefined();

    const foundValid = msgs.find((m: any) => m.id === validMsg.id);
    expect(foundValid).toBeDefined();

    // Fetch conversation list API
    const resConvs = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(resConvs.status).toBe(200);
    const conv = resConvs.body.data.find((c: any) => c.id === testConvId);
    expect(conv).toBeDefined();
    expect(conv.lastMessage).toBeDefined();
    expect(new Date(conv.lastMessage.createdAt).getTime()).toBeGreaterThan(Date.now() - 24 * 60 * 60 * 1000);
  });

  it('6. Permanently deletes expired messages from database during cleanup', async () => {
    // Run cleanup
    const deletedCount = await runChatRetentionCleanup();
    expect(deletedCount).toBeGreaterThanOrEqual(1);

    // Verify expired message is deleted from DB
    const allMsgsInDb = await db.list('messages', { conversation_id: testConvId });
    const expiredInDb = allMsgsInDb.find((m: any) => m.message === 'Expired message older than 24h');
    expect(expiredInDb).toBeUndefined();

    // Verify users & conversations remain intact
    const userInDb = await db.find('users', { id: driverUser.id });
    expect(userInDb).toBeDefined();
  });
});
