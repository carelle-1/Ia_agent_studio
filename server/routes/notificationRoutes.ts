import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, requireAuth } from '../middleware.js';

const router = Router();

// Get user notifications
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const notifs = db.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = notifs.filter((n) => !n.read).length;

  return res.json({
    notifications: notifs,
    unreadCount,
  });
});

// Mark single notification as read
router.put('/:id/read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const notif = db.notifications.find((n) => n.id === req.params.id && n.userId === userId);

  if (!notif) return res.status(404).json({ error: 'Notification introuvable.' });

  notif.read = true;
  db.persist();

  return res.json({ success: true });
});

// Mark all as read
router.put('/mark-all-read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userNotifs = db.notifications.filter((n) => n.userId === userId);
  for (const n of userNotifs) {
    n.read = true;
  }
  db.persist();

  return res.json({ success: true, count: userNotifs.length });
});

export default router;
