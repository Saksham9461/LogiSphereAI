import {Router} from 'express';
import {db} from '../../config/database';

export const chatRouter = Router();

chatRouter.get('/messages', async (_req, res) => {
  const messages = await db.list('chat_messages');
  res.json(messages.map((m: any) => ({id: m.messageId, text: m.text, sender: m.senderId === 'usr-manager' ? 'me' : 'other', timestamp: new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}), name: m.senderName, ...m})));
});

chatRouter.post('/messages', async (req, res) => {
  const message = await db.insert('chat_messages', {messageId: db.makeId('msg-'), text: req.body?.text, senderId: req.user?.userId ?? 'usr-manager', senderName: req.body?.senderName ?? 'Fleet Manager'});
  res.status(201).json({id: message.messageId, text: message.text, sender: 'me', timestamp: new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}), name: message.senderName});
});
