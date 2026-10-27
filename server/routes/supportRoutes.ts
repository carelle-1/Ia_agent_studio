import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, requireAuth } from '../middleware.js';
import { Conversation, Message } from '../types.js';

const router = Router();

// List conversations for user or admin
router.get('/conversations', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let conversations: Conversation[] = [];

  if (user.role === 'superadmin') {
    conversations = [...db.conversations];
  } else {
    conversations = db.conversations.filter((c) => c.userId === user.id);
  }

  // Populate last message & user info
  const populated = conversations.map((conv) => {
    const messages = db.messages.filter((m) => m.conversationId === conv.id);
    const lastMsg = messages[messages.length - 1];
    const unreadCount = messages.filter((m) => !m.read && m.senderRole !== (user.role === 'superadmin' ? 'admin' : 'user')).length;
    const convUser = db.users.find((u) => u.id === conv.userId);

    return {
      ...conv,
      lastMessage: lastMsg?.text || '',
      unreadCount,
      user: convUser ? { firstName: convUser.firstName, lastName: convUser.lastName, email: convUser.email, companyName: convUser.companyName } : null,
    };
  });

  return res.json(populated);
});

// Create conversation
router.post('/conversations', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { subject, initialMessage } = req.body;

  if (!subject || !initialMessage) {
    return res.status(400).json({ error: 'Le sujet et le message initial sont obligatoires.' });
  }

  const nowIso = new Date().toISOString();
  const convId = `conv_${Date.now()}`;

  const conversation: Conversation = {
    id: convId,
    userId: user.id,
    subject: subject.trim(),
    status: 'waiting_admin',
    lastMessageAt: nowIso,
    createdAt: nowIso,
  };
  db.conversations.push(conversation);

  const message: Message = {
    id: `msg_${Date.now()}`,
    conversationId: convId,
    senderId: user.id,
    senderRole: user.role === 'superadmin' ? 'admin' : 'user',
    text: initialMessage.trim(),
    read: false,
    createdAt: nowIso,
  };
  db.messages.push(message);

  db.persist();

  return res.status(201).json({
    conversation,
    message,
  });
});

// Get messages in a conversation
router.get('/conversations/:id/messages', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const conv = db.conversations.find((c) => c.id === req.params.id);

  if (!conv) {
    return res.status(404).json({ error: 'Conversation introuvable.' });
  }

  // Tenant check: user can only see own conversations unless superadmin
  if (user.role !== 'superadmin' && conv.userId !== user.id) {
    return res.status(403).json({ error: 'Accès non autorisé à cette conversation.' });
  }

  // Mark other party's messages as read
  const messages = db.messages.filter((m) => m.conversationId === conv.id);
  for (const m of messages) {
    if (user.role === 'superadmin' && m.senderRole === 'user') {
      m.read = true;
    } else if (user.role !== 'superadmin' && m.senderRole === 'admin') {
      m.read = true;
    }
  }
  db.persist();

  return res.json({
    conversation: conv,
    messages,
  });
});

// Send message in conversation
router.post('/conversations/:id/messages', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const conv = db.conversations.find((c) => c.id === req.params.id);

  if (!conv) {
    return res.status(404).json({ error: 'Conversation introuvable.' });
  }

  if (user.role !== 'superadmin' && conv.userId !== user.id) {
    return res.status(403).json({ error: 'Accès non autorisé.' });
  }

  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Le message ne peut pas être vide.' });
  }

  const nowIso = new Date().toISOString();
  const message: Message = {
    id: `msg_${Date.now()}`,
    conversationId: conv.id,
    senderId: user.id,
    senderRole: user.role === 'superadmin' ? 'admin' : 'user',
    text: text.trim(),
    read: false,
    createdAt: nowIso,
  };

  db.messages.push(message);
  conv.lastMessageAt = nowIso;
  conv.status = user.role === 'superadmin' ? 'open' : 'waiting_admin';

  // If admin replies, notify user
  if (user.role === 'superadmin') {
    db.notifications.push({
      id: `notif_${Date.now()}`,
      userId: conv.userId,
      type: 'admin_message',
      title: 'Nouveau message de l’administration',
      message: `L’équipe Meta Colab a répondu à votre demande : "${conv.subject}".`,
      link: '/support',
      read: false,
      createdAt: nowIso,
    });
  }

  db.persist();

  return res.status(201).json(message);
});

export default router;
