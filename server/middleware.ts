import { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import { User, Subscription, SubscriptionPlan } from './types.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
  sessionToken?: string;
  userSubscription?: Subscription;
  userPlan?: SubscriptionPlan;
}

/**
 * Middleware: extracts and verifies session token
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token = '';

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/session=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) {
    return next();
  }

  const session = db.sessions.find((s) => s.token === token && new Date(s.expiresAt) > new Date());
  if (!session) {
    return next();
  }

  const user = db.users.find((u) => u.id === session.userId);
  if (!user || user.status === 'suspended') {
    return next();
  }

  req.user = user;
  req.sessionToken = token;

  // Attach active subscription & plan
  const sub = db.subscriptions.find((s) => s.userId === user.id && s.status !== 'canceled');
  if (sub) {
    req.userSubscription = sub;
    req.userPlan = db.plans.find((p) => p.id === sub.planId);
  }

  next();
}

/**
 * Middleware: requires valid logged-in user
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentification requise pour accéder à cette ressource.' });
  }
  next();
}

/**
 * Middleware: requires Super Admin role
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Accès refusé. Privilèges Super Administrateur requis.' });
  }
  next();
}

/**
 * Check and enforce subscription quotas
 */
export function checkPlanLimits(action: 'create_agent' | 'assign_page' | 'create_post') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    // Super admin bypasses commercial quotas
    if (req.user.role === 'superadmin') {
      return next();
    }

    const sub = req.userSubscription;
    const plan = req.userPlan;

    if (!sub || !plan) {
      return res.status(403).json({
        error: 'Aucun abonnement actif trouvé. Veuillez souscrire à un pack pour continuer.',
      });
    }

    // Check trial expiration for Free Test
    if (sub.status === 'trialing' && sub.trialEndsAt && new Date(sub.trialEndsAt) < new Date()) {
      return res.status(403).json({
        error: 'Votre période d’essai de 7 jours est arrivée à expiration. Choisissez un pack pour continuer à publier.',
        code: 'TRIAL_EXPIRED',
      });
    }

    if (action === 'create_agent') {
      const currentAgentsCount = db.agents.filter((a) => a.userId === req.user!.id && a.status !== 'archived').length;
      if (plan.maxAgents !== -1 && currentAgentsCount >= plan.maxAgents) {
        return res.status(403).json({
          error: `Limite atteinte : Votre forfait ${plan.name} vous autorise un maximum de ${plan.maxAgents} agent(s). Passez au pack supérieur pour en ajouter d'autres.`,
          code: 'AGENT_QUOTA_REACHED',
        });
      }
    }

    if (action === 'assign_page') {
      const agentId = req.body.agentId;
      const currentAssignments = db.assignments.filter((a) => a.agentId === agentId && a.userId === req.user!.id).length;
      if (plan.maxPagesPerAgent !== -1 && currentAssignments >= plan.maxPagesPerAgent) {
        return res.status(403).json({
          error: `Limite atteinte : Votre forfait ${plan.name} vous autorise ${plan.maxPagesPerAgent} page(s) par agent.`,
          code: 'PAGE_PER_AGENT_QUOTA_REACHED',
        });
      }
    }

    if (action === 'create_post') {
      const today = new Date().toISOString().split('T')[0];
      const postsToday = db.posts.filter((p) => p.userId === req.user!.id && p.createdAt.startsWith(today)).length;
      if (plan.maxPostsPerDay && plan.maxPostsPerDay !== -1 && postsToday >= plan.maxPostsPerDay) {
        return res.status(403).json({
          error: `Limite quotidienne atteinte : Votre forfait ${plan.name} vous permet ${plan.maxPostsPerDay} publication(s) par jour.`,
          code: 'DAILY_POST_QUOTA_REACHED',
        });
      }
    }

    next();
  };
}
