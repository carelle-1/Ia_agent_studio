import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, requireAuth } from '../middleware.js';
import { aiService } from '../services/aiService.js';
import { EditorialCalendar, EditorialCalendarItem, Post } from '../types.js';

const router = Router();

// Get calendar items for a page or user
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { pageId, week, year } = req.query;

  let calendars = db.calendars.filter((c) => c.userId === userId);

  if (pageId) {
    calendars = calendars.filter((c) => c.pageId === String(pageId));
  }
  if (week) {
    calendars = calendars.filter((c) => c.weekNumber === Number(week));
  }
  if (year) {
    calendars = calendars.filter((c) => c.year === Number(year));
  }

  const calendarIds = calendars.map((c) => c.id);
  const items = db.calendarItems.filter((i) => calendarIds.includes(i.calendarId));

  return res.json({
    calendars,
    items,
  });
});

// Generate intelligent weekly editorial calendar
router.post('/generate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { pageId, agentId, startDate, frequency = 7 } = req.body;

  if (!pageId || !agentId) {
    return res.status(400).json({ error: 'Page et Agent requis pour générer un calendrier éditorial.' });
  }

  const page = db.socialPages.find((p) => p.id === pageId && p.userId === userId);
  const agent = db.agents.find((a) => a.id === agentId && a.userId === userId);
  const brand = db.brandProfiles.find((b) => b.userId === userId);

  if (!page || !agent) {
    return res.status(404).json({ error: 'Page ou Agent introuvable.' });
  }

  const start = startDate ? new Date(startDate) : new Date();
  const weekNumber = getWeekNumber(start);
  const year = start.getFullYear();

  // Find or create EditorialCalendar
  let calendar = db.calendars.find(
    (c) => c.userId === userId && c.pageId === page.id && c.weekNumber === weekNumber && c.year === year
  );

  const nowIso = new Date().toISOString();

  if (!calendar) {
    calendar = {
      id: `cal_${Date.now()}`,
      userId,
      pageId: page.id,
      agentId: agent.id,
      weekNumber,
      year,
      title: `Semaine ${weekNumber} - ${page.name} (${agent.name})`,
      status: 'pending_review',
      generatedAt: nowIso,
    };
    db.calendars.push(calendar);
  } else {
    calendar.status = 'pending_review';
    calendar.generatedAt = nowIso;
  }

  // Generate slots via AI service
  const generatedSlots = await aiService.generateEditorialCalendar(
    userId,
    agent,
    page,
    brand,
    start.toISOString().split('T')[0],
    Number(frequency)
  );

  const newItems: EditorialCalendarItem[] = [];

  for (const slot of generatedSlots) {
    const item: EditorialCalendarItem = {
      id: `cal_item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      calendarId: calendar.id,
      pageId: page.id,
      agentId: agent.id,
      scheduledDate: slot.scheduledDate || start.toISOString().split('T')[0],
      scheduledTime: slot.scheduledTime || '12:00',
      timeZone: slot.timeZone || 'Europe/Paris',
      objective: slot.objective || 'Notoriété',
      theme: slot.theme || 'Nouvelle publication',
      format: slot.format || 'single_image',
      editorialAngle: slot.editorialAngle || 'Angle d’expert',
      summary: slot.summary || '',
      callToAction: slot.callToAction || 'Donnez votre avis en commentaire !',
      status: 'suggested',
    };
    db.calendarItems.push(item);
    newItems.push(item);
  }

  // Notification
  db.notifications.push({
    id: `notif_${Date.now()}`,
    userId,
    type: 'calendar_generated',
    title: 'Calendrier éditorial prêt pour révision',
    message: `L’agent ${agent.name} a généré ${newItems.length} créneaux pour la semaine ${weekNumber} sur ${page.name}.`,
    link: '/calendar',
    read: false,
    createdAt: nowIso,
  });

  db.persist();

  return res.status(201).json({
    calendar,
    items: newItems,
    message: 'Calendrier éditorial généré avec succès par l’agent IA.',
  });
});

// Update calendar item
router.put('/items/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const item = db.calendarItems.find((i) => i.id === req.params.id);

  if (!item) {
    return res.status(404).json({ error: 'Créneau introuvable.' });
  }

  const calendar = db.calendars.find((c) => c.id === item.calendarId && c.userId === userId);
  if (!calendar) {
    return res.status(403).json({ error: 'Accès non autorisé.' });
  }

  const { scheduledDate, scheduledTime, objective, theme, format, editorialAngle, summary, callToAction, status } = req.body;

  if (scheduledDate) item.scheduledDate = scheduledDate;
  if (scheduledTime) item.scheduledTime = scheduledTime;
  if (objective) item.objective = objective;
  if (theme) item.theme = theme;
  if (format) item.format = format;
  if (editorialAngle) item.editorialAngle = editorialAngle;
  if (summary) item.summary = summary;
  if (callToAction) item.callToAction = callToAction;
  if (status) item.status = status;

  db.persist();

  return res.json({ item, message: 'Créneau mis à jour.' });
});

// Delete calendar item
router.delete('/items/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const itemIndex = db.calendarItems.findIndex((i) => i.id === req.params.id);

  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Créneau introuvable.' });
  }

  const item = db.calendarItems[itemIndex];
  const calendar = db.calendars.find((c) => c.id === item.calendarId && c.userId === userId);
  if (!calendar) {
    return res.status(403).json({ error: 'Accès non autorisé.' });
  }

  db.calendarItems.splice(itemIndex, 1);
  db.persist();

  return res.json({ success: true, message: 'Créneau supprimé.' });
});

// Convert calendar item into full post proposition via AI
router.post('/items/:id/generate-post', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const item = db.calendarItems.find((i) => i.id === req.params.id);

  if (!item) return res.status(404).json({ error: 'Créneau introuvable.' });

  const page = db.socialPages.find((p) => p.id === item.pageId && p.userId === userId);
  const agent = db.agents.find((a) => a.id === item.agentId && a.userId === userId);
  const brand = db.brandProfiles.find((b) => b.userId === userId);

  if (!page || !agent) return res.status(404).json({ error: 'Page ou Agent manquant.' });

  const generated = await aiService.generatePostContent(userId, agent, page, brand, item);
  const nowIso = new Date().toISOString();

  const post: Post = {
    id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId,
    pageId: page.id,
    agentId: agent.id,
    calendarItemId: item.id,
    platform: page.platform,
    contentFormatted: generated.contentFormatted,
    contentRawText: generated.contentRawText,
    visualPrompt: generated.visualPrompt,
    visualUrl: generated.visualUrl,
    visualVersions: [
      {
        id: `vver_${Date.now()}`,
        url: generated.visualUrl,
        prompt: generated.visualPrompt,
        createdAt: nowIso,
      },
    ],
    format: generated.format || item.format,
    callToAction: generated.callToAction,
    hashtags: generated.hashtags,
    scheduledDate: item.scheduledDate,
    scheduledTime: item.scheduledTime,
    timeZone: item.timeZone,
    status: 'pending_approval', // MANDATORY GATEKEEPER
    approvalRequired: true,
    versionNumber: 1,
    idempotencyKey: `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  db.posts.push(post);

  // Link postId back to calendar item
  item.postId = post.id;
  item.status = 'post_generated';

  // Notification for approval
  db.notifications.push({
    id: `notif_${Date.now()}`,
    userId,
    type: 'post_ready_approval',
    title: 'Proposition prête pour validation',
    message: `L'agent ${agent.name} a rédigé la publication "${item.theme}". Votre validation explicite est requise.`,
    link: `/posts?id=${post.id}`,
    read: false,
    createdAt: nowIso,
  });

  db.persist();

  return res.status(201).json({
    post,
    item,
    message: 'Publication générée avec succès ! Elle est maintenant soumise à votre validation.',
  });
});

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default router;
