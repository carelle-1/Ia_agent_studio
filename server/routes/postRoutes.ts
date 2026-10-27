import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, requireAuth, checkPlanLimits } from '../middleware.js';
import { aiService } from '../services/aiService.js';
import { schedulerService } from '../services/schedulerService.js';
import { Post, PostVersion, ScheduledJob } from '../types.js';

const router = Router();

// List posts with optional status/page/agent filter
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { status, pageId, agentId } = req.query;

  let posts = db.posts.filter((p) => p.userId === userId);

  if (status && typeof status === 'string') {
    posts = posts.filter((p) => p.status === status);
  }
  if (pageId && typeof pageId === 'string') {
    posts = posts.filter((p) => p.pageId === pageId);
  }
  if (agentId && typeof agentId === 'string') {
    posts = posts.filter((p) => p.agentId === agentId);
  }

  // Sort by scheduledDate / scheduledTime ascending for upcoming, or updatedAt descending
  posts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const populated = posts.map((post) => {
    const page = db.socialPages.find((p) => p.id === post.pageId);
    const agent = db.agents.find((a) => a.id === post.agentId);
    return {
      ...post,
      page,
      agent,
    };
  });

  return res.json(populated);
});

// Get post detail with version history
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const post = db.posts.find((p) => p.id === req.params.id && p.userId === userId);

  if (!post) {
    return res.status(404).json({ error: 'Publication introuvable.' });
  }

  const page = db.socialPages.find((p) => p.id === post.pageId);
  const agent = db.agents.find((a) => a.id === post.agentId);
  const versions = db.postVersions.filter((v) => v.postId === post.id).sort((a, b) => b.versionNumber - a.versionNumber);

  return res.json({
    ...post,
    page,
    agent,
    versions,
  });
});

// Update post content with version tracking & mandatory re-approval invalidation
router.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const post = db.posts.find((p) => p.id === req.params.id && p.userId === userId);

  if (!post) {
    return res.status(404).json({ error: 'Publication introuvable.' });
  }

  const {
    contentFormatted,
    contentRawText,
    visualPrompt,
    visualUrl,
    callToAction,
    hashtags,
    scheduledDate,
    scheduledTime,
    changeReason = 'Modification manuelle par l’utilisateur',
  } = req.body;

  const nowIso = new Date().toISOString();

  // Snapshot previous version
  const currentVersions = db.postVersions.filter((v) => v.postId === post.id);
  const nextVer = (post.versionNumber || 1) + 1;

  const versionSnapshot: PostVersion = {
    id: `pver_${Date.now()}`,
    postId: post.id,
    versionNumber: post.versionNumber || 1,
    contentFormatted: post.contentFormatted,
    contentRawText: post.contentRawText,
    visualPrompt: post.visualPrompt,
    visualUrl: post.visualUrl,
    modifiedByUserId: userId,
    changeReason,
    createdAt: nowIso,
  };
  db.postVersions.push(versionSnapshot);

  // Apply updates
  if (contentFormatted !== undefined) post.contentFormatted = contentFormatted;
  if (contentRawText !== undefined) {
    post.contentRawText = contentRawText;
  } else if (contentFormatted !== undefined) {
    post.contentRawText = contentFormatted.replace(/\*\*/g, '').replace(/###/g, '');
  }
  if (visualPrompt !== undefined) post.visualPrompt = visualPrompt;
  if (visualUrl !== undefined) post.visualUrl = visualUrl;
  if (callToAction !== undefined) post.callToAction = callToAction;
  if (Array.isArray(hashtags)) post.hashtags = hashtags;
  if (scheduledDate !== undefined) post.scheduledDate = scheduledDate;
  if (scheduledTime !== undefined) post.scheduledTime = scheduledTime;

  post.versionNumber = nextVer;
  post.updatedAt = nowIso;

  // STRICT COMPLIANCE RULE #9 & SECTION 16:
  // If the post was previously approved, any substantive update invalidates the approval!
  let approvalInvalidated = false;
  if (post.status === 'approved' || post.status === 'scheduled') {
    post.status = 'pending_approval';
    post.approvedByUserId = undefined;
    post.approvedAt = undefined;
    approvalInvalidated = true;

    // Remove any pending scheduled jobs
    db.scheduledJobs = db.scheduledJobs.filter((j) => j.postId !== post.id);
  }

  db.persist();

  return res.json({
    post,
    approvalInvalidated,
    message: approvalInvalidated
      ? 'Publication modifiée. Conformément à la règle de validation obligatoire, le statut a été réinitialisé à "En attente de validation".'
      : 'Publication enregistrée avec succès.',
  });
});

// Regenerate text variant via AI
router.post('/:id/regenerate-text', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const post = db.posts.find((p) => p.id === req.params.id && p.userId === userId);

  if (!post) return res.status(404).json({ error: 'Publication introuvable.' });

  const { variantType = 'shorter' } = req.body;
  const page = db.socialPages.find((p) => p.id === post.pageId);

  const result = await aiService.regeneratePostVariant(
    userId,
    post.contentFormatted,
    variantType,
    page?.platform || post.platform
  );

  return res.json({
    contentFormatted: result.contentFormatted,
    contentRawText: result.contentRawText,
    variantType,
  });
});

// Regenerate visual proposal via AI
router.post('/:id/regenerate-visual', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const post = db.posts.find((p) => p.id === req.params.id && p.userId === userId);

  if (!post) return res.status(404).json({ error: 'Publication introuvable.' });

  const { prompt } = req.body;
  const brand = db.brandProfiles.find((b) => b.userId === userId);

  const targetPrompt = prompt || post.visualPrompt;
  const newVisual = await aiService.regenerateVisualAsset(userId, targetPrompt, brand);

  const nowIso = new Date().toISOString();
  const vver = {
    id: `vver_${Date.now()}`,
    url: newVisual.url,
    prompt: newVisual.prompt,
    createdAt: nowIso,
  };

  if (!post.visualVersions) post.visualVersions = [];
  post.visualVersions.push(vver);
  post.visualUrl = newVisual.url;
  post.visualPrompt = newVisual.prompt;
  post.updatedAt = nowIso;

  // Invalidate previous approval if modified
  if (post.status === 'approved' || post.status === 'scheduled') {
    post.status = 'pending_approval';
    post.approvedByUserId = undefined;
    post.approvedAt = undefined;
  }

  db.persist();

  return res.json({
    visualUrl: newVisual.url,
    visualPrompt: newVisual.prompt,
    visualVersions: post.visualVersions,
    message: 'Nouveau visuel généré avec succès !',
  });
});

// Approve post explicitly (Human Gatekeeper)
router.post('/:id/approve', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const post = db.posts.find((p) => p.id === req.params.id && p.userId === userId);

  if (!post) {
    return res.status(404).json({ error: 'Publication introuvable.' });
  }

  const nowIso = new Date().toISOString();
  post.approvedByUserId = userId;
  post.approvedAt = nowIso;
  post.rejectionReason = undefined;

  // Check if scheduled date/time is in the future
  const scheduledIso = `${post.scheduledDate}T${post.scheduledTime}:00`;
  const isFuture = new Date(scheduledIso) > new Date();

  if (isFuture) {
    post.status = 'scheduled';

    // Register or update ScheduledJob
    let job = db.scheduledJobs.find((j) => j.postId === post.id);
    if (!job) {
      job = {
        id: `job_${Date.now()}`,
        postId: post.id,
        pageId: post.pageId,
        scheduledFor: scheduledIso,
        status: 'pending',
        attemptsCount: 0,
        maxAttempts: 3,
        createdAt: nowIso,
      };
      db.scheduledJobs.push(job);
    } else {
      job.scheduledFor = scheduledIso;
      job.status = 'pending';
    }
  } else {
    post.status = 'approved';
  }

  post.updatedAt = nowIso;

  db.auditLogs.push({
    id: `audit_${Date.now()}`,
    userId,
    userEmail: req.user!.email,
    action: 'POST_APPROVED',
    entityType: 'Post',
    entityId: post.id,
    details: `Publication approuvée par ${req.user!.email}. Statut: ${post.status}`,
    timestamp: nowIso,
  });

  db.persist();

  return res.json({
    post,
    message: isFuture
      ? `Publication validée et programmée pour le ${post.scheduledDate} à ${post.scheduledTime}.`
      : 'Publication validée avec succès ! Vous pouvez la publier immédiatement.',
  });
});

// Reject post
router.post('/:id/reject', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const post = db.posts.find((p) => p.id === req.params.id && p.userId === userId);

  if (!post) return res.status(404).json({ error: 'Publication introuvable.' });

  const { reason = 'Non conforme aux attentes' } = req.body;
  post.status = 'rejected';
  post.rejectionReason = reason;
  post.approvedByUserId = undefined;
  post.approvedAt = undefined;
  post.updatedAt = new Date().toISOString();

  // Remove any pending job
  db.scheduledJobs = db.scheduledJobs.filter((j) => j.postId !== post.id);

  db.persist();

  return res.json({ post, message: 'Publication rejetée.' });
});

// Immediate publication trigger
router.post('/:id/publish-now', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const result = await schedulerService.publishPostImmediately(req.params.id, userId);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  return res.json(result);
});

export default router;
