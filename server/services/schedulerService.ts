import { db } from '../db.js';
import { metaService } from './metaService.js';
import { Post, ScheduledJob } from '../types.js';

export class SchedulerService {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  /**
   * Starts the background scheduler loop (checks every 30 seconds)
   */
  start(intervalMs = 30000) {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick().catch((err) => console.error('Error during scheduler tick:', err));
    }, intervalMs);
    console.log(`[Scheduler] Background publisher service initialized (interval: ${intervalMs}ms)`);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Processes all pending scheduled jobs that have reached their target execution time
   */
  async tick() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      // Find jobs that are due
      const pendingJobs = db.scheduledJobs.filter((j) => {
        return (
          (j.status === 'pending' || (j.status === 'failed' && j.attemptsCount < j.maxAttempts)) &&
          new Date(j.scheduledFor) <= now &&
          (!j.lockedAt || Date.now() - new Date(j.lockedAt).getTime() > 120000) // 2 min lock timeout
        );
      });

      for (const job of pendingJobs) {
        await this.processJob(job);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Executes a single publication job with strict verification and lock
   */
  async processJob(job: ScheduledJob) {
    // Acquire lock
    job.status = 'processing';
    job.lockKey = `lock_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    job.lockedAt = new Date().toISOString();
    job.attemptsCount += 1;
    db.persist();

    const post = db.posts.find((p) => p.id === job.postId);
    if (!post) {
      job.status = 'failed';
      job.lastError = 'Publication introuvable dans la base de données.';
      db.persist();
      return;
    }

    // STRICT MANDATORY VALIDATION RULE #9 & SECTION 16:
    // If post is not approved by human, reject immediately!
    if (!post.approvedByUserId || (post.status !== 'approved' && post.status !== 'scheduled')) {
      job.status = 'failed';
      job.lastError = 'Publication rejetée : Aucune validation humaine explicite n’a été accordée.';
      post.status = 'pending_approval';
      db.persist();
      return;
    }

    const page = db.socialPages.find((p) => p.id === post.pageId);
    if (!page) {
      job.status = 'failed';
      job.lastError = 'Page sociale introuvable.';
      db.persist();
      return;
    }

    const account = db.socialAccounts.find((a) => a.id === page.socialAccountId);
    if (!account) {
      job.status = 'failed';
      job.lastError = 'Compte social d’authentification introuvable.';
      db.persist();
      return;
    }

    // Update status to publishing
    post.status = 'publishing';
    db.persist();

    // Call Meta Service
    const result = await metaService.publishPost(post, page, account);

    const nowIso = new Date().toISOString();

    if (result.success && result.metaPostId) {
      // Mark as published
      job.status = 'completed';
      post.status = 'published';
      post.publishedAt = nowIso;
      post.metaExternalPostId = result.metaPostId;

      // Log attempt
      db.attempts.push({
        id: `att_${Date.now()}`,
        postId: post.id,
        pageId: page.id,
        timestamp: nowIso,
        status: 'success',
        responsePayload: JSON.stringify({ metaPostId: result.metaPostId }),
      });

      // Update user subscription usage
      const usage = db.usages.find((u) => u.userId === post.userId);
      if (usage) {
        usage.postsPublishedCount += 1;
      }

      // In-app notification
      db.notifications.push({
        id: `notif_${Date.now()}`,
        userId: post.userId,
        type: 'post_published',
        title: 'Publication réussie !',
        message: `Votre publication "${post.contentRawText.slice(0, 45)}..." a été mise en ligne sur ${page.name} (${page.platform}).`,
        link: '/posts',
        read: false,
        createdAt: nowIso,
      });

      // Audit Log
      db.auditLogs.push({
        id: `audit_${Date.now()}`,
        userId: post.userId,
        action: 'POST_PUBLISHED',
        entityType: 'Post',
        entityId: post.id,
        details: `Publication réussie sur ${page.platform} (${page.name}), ID Meta: ${result.metaPostId}`,
        timestamp: nowIso,
      });
    } else {
      // Failed publication
      job.status = job.attemptsCount >= job.maxAttempts ? 'failed' : 'pending';
      job.lastError = result.errorMessage || 'Erreur inconnue lors de la publication Meta';
      post.status = job.attemptsCount >= job.maxAttempts ? 'failed' : 'scheduled';

      db.attempts.push({
        id: `att_${Date.now()}`,
        postId: post.id,
        pageId: page.id,
        timestamp: nowIso,
        status: 'failed',
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      });

      if (job.status === 'failed') {
        db.notifications.push({
          id: `notif_${Date.now()}`,
          userId: post.userId,
          type: 'post_failed',
          title: 'Échec de publication',
          message: `La publication programmée sur ${page.name} a échoué : ${result.errorMessage}`,
          link: '/posts',
          read: false,
          createdAt: nowIso,
        });
      }
    }

    db.persist();
  }

  /**
   * Immediately publishes an approved post on demand
   */
  async publishPostImmediately(postId: string, userId: string): Promise<{ success: boolean; message: string; metaPostId?: string }> {
    const post = db.posts.find((p) => p.id === postId && p.userId === userId);
    if (!post) {
      return { success: false, message: 'Publication introuvable.' };
    }

    // MANDATORY USER APPROVAL CHECK:
    if (!post.approvedByUserId || (post.status !== 'approved' && post.status !== 'scheduled')) {
      return {
        success: false,
        message: 'Règle obligatoire : La publication doit d’abord être explicitement validée par l’utilisateur.',
      };
    }

    const page = db.socialPages.find((p) => p.id === post.pageId);
    if (!page) {
      return { success: false, message: 'Page sociale associée introuvable.' };
    }

    const account = db.socialAccounts.find((a) => a.id === page.socialAccountId);
    if (!account) {
      return { success: false, message: 'Compte social non configuré.' };
    }

    // Set to publishing
    post.status = 'publishing';
    db.persist();

    const result = await metaService.publishPost(post, page, account);
    const nowIso = new Date().toISOString();

    if (result.success && result.metaPostId) {
      post.status = 'published';
      post.publishedAt = nowIso;
      post.metaExternalPostId = result.metaPostId;

      db.attempts.push({
        id: `att_${Date.now()}`,
        postId: post.id,
        pageId: page.id,
        timestamp: nowIso,
        status: 'success',
        responsePayload: JSON.stringify({ metaPostId: result.metaPostId }),
      });

      const usage = db.usages.find((u) => u.userId === userId);
      if (usage) {
        usage.postsPublishedCount += 1;
      }

      db.notifications.push({
        id: `notif_${Date.now()}`,
        userId,
        type: 'post_published',
        title: 'Publication en direct réussie',
        message: `Votre publication a été immédiatement diffusée sur ${page.name}.`,
        link: '/posts',
        read: false,
        createdAt: nowIso,
      });

      db.auditLogs.push({
        id: `audit_${Date.now()}`,
        userId,
        action: 'POST_PUBLISHED_IMMEDIATE',
        entityType: 'Post',
        entityId: post.id,
        details: `Publication immédiate sur ${page.platform} (${page.name}), ID: ${result.metaPostId}`,
        timestamp: nowIso,
      });

      db.persist();
      return {
        success: true,
        message: 'Publication diffusée avec succès sur Meta !',
        metaPostId: result.metaPostId,
      };
    } else {
      post.status = 'failed';
      db.persist();
      return {
        success: false,
        message: result.errorMessage || 'Échec de publication Meta.',
      };
    }
  }
}

export const schedulerService = new SchedulerService();
