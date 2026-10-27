import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, requireAdmin } from '../middleware.js';
import { encryptSecret, sanitizeUser } from '../security.js';
import { AIProviderConfig, SubscriptionPlan } from '../types.js';

const router = Router();

// Protect all admin routes with requireAdmin
router.use(requireAdmin);

// Global Administrative KPIs & Metrics
router.get('/metrics', (req: AuthenticatedRequest, res: Response) => {
  const users = db.users;
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'active').length;
  const totalAgents = db.agents.filter((a) => a.status !== 'archived').length;
  const totalPages = db.socialPages.filter((p) => p.status === 'active').length;
  const totalPosts = db.posts.length;
  const publishedPosts = db.posts.filter((p) => p.status === 'published').length;
  const pendingApprovalPosts = db.posts.filter((p) => p.status === 'pending_approval').length;
  const scheduledPosts = db.posts.filter((p) => p.status === 'scheduled').length;

  // Plan distribution
  const planDistribution: Record<string, number> = {};
  for (const sub of db.subscriptions) {
    if (sub.status !== 'canceled') {
      const plan = db.plans.find((p) => p.id === sub.planId);
      const name = plan ? plan.name : 'Inconnu';
      planDistribution[name] = (planDistribution[name] || 0) + 1;
    }
  }

  // AI Usage
  const totalAiTokens = db.aiUsageLogs.reduce((sum, log) => sum + log.tokensUsed, 0);
  const totalAiCostEur = +(db.aiUsageLogs.reduce((sum, log) => sum + log.estimatedCostEur, 0)).toFixed(3);

  // Revenue
  const totalRevenueEur = db.payments
    .filter((p) => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amount, 0);

  // Scheduled Jobs Queue
  const pendingJobs = db.scheduledJobs.filter((j) => j.status === 'pending').length;
  const failedJobs = db.scheduledJobs.filter((j) => j.status === 'failed').length;

  return res.json({
    kpis: {
      totalUsers,
      activeUsers,
      totalAgents,
      totalPages,
      totalPosts,
      publishedPosts,
      pendingApprovalPosts,
      scheduledPosts,
      totalRevenueEur,
      totalAiTokens,
      totalAiCostEur,
      pendingJobs,
      failedJobs,
    },
    planDistribution,
    recentAuditLogs: db.auditLogs.slice(-10).reverse(),
    recentAiLogs: db.aiUsageLogs.slice(-10).reverse(),
  });
});

// List users with subscription & stats
router.get('/users', (req: AuthenticatedRequest, res: Response) => {
  const usersWithMeta = db.users.map((user) => {
    const sub = db.subscriptions.find((s) => s.userId === user.id && s.status !== 'canceled');
    const plan = sub ? db.plans.find((p) => p.id === sub.planId) : null;
    const agentsCount = db.agents.filter((a) => a.userId === user.id && a.status !== 'archived').length;
    const pagesCount = db.socialPages.filter((p) => p.userId === user.id).length;
    const postsCount = db.posts.filter((p) => p.userId === user.id).length;

    return {
      ...sanitizeUser(user),
      subscription: sub,
      plan,
      agentsCount,
      pagesCount,
      postsCount,
    };
  });

  return res.json(usersWithMeta);
});

// Suspend or reactivate user
router.put('/users/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  const user = db.users.find((u) => u.id === req.params.id);

  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  if (user.role === 'superadmin' && status === 'suspended') {
    return res.status(400).json({ error: 'Impossible de suspendre un Super Administrateur.' });
  }

  user.status = status === 'suspended' ? 'suspended' : 'active';
  user.updatedAt = new Date().toISOString();

  db.auditLogs.push({
    id: `audit_${Date.now()}`,
    userId: req.user!.id,
    userEmail: req.user!.email,
    action: 'USER_STATUS_CHANGE',
    entityType: 'User',
    entityId: user.id,
    details: `Changement de statut pour ${user.email} -> ${user.status}`,
    timestamp: new Date().toISOString(),
  });

  db.persist();

  return res.json({ user: sanitizeUser(user), message: `Statut mis à jour : ${user.status}.` });
});

// Change user plan from admin
router.put('/users/:id/plan', (req: AuthenticatedRequest, res: Response) => {
  const { planId } = req.body;
  const user = db.users.find((u) => u.id === req.params.id);
  const plan = db.plans.find((p) => p.id === planId);

  if (!user || !plan) return res.status(404).json({ error: 'Utilisateur ou forfait introuvable.' });

  let sub = db.subscriptions.find((s) => s.userId === user.id && s.status !== 'canceled');
  const nowIso = new Date().toISOString();

  if (!sub) {
    sub = {
      id: `sub_${Date.now()}`,
      userId: user.id,
      planId: plan.id,
      status: 'active',
      startDate: nowIso,
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      autoRenew: true,
      updatedAt: nowIso,
    };
    db.subscriptions.push(sub);
  } else {
    sub.planId = plan.id;
    sub.status = 'active';
    sub.updatedAt = nowIso;
  }

  db.auditLogs.push({
    id: `audit_${Date.now()}`,
    userId: req.user!.id,
    userEmail: req.user!.email,
    action: 'ADMIN_PLAN_ASSIGNMENT',
    entityType: 'Subscription',
    entityId: sub.id,
    details: `Attribution manuelle du pack ${plan.name} à l'utilisateur ${user.email}`,
    timestamp: nowIso,
  });

  db.persist();

  return res.json({ message: `Pack ${plan.name} attribué à ${user.firstName} ${user.lastName}.` });
});

// List subscription plans
router.get('/plans', (req: AuthenticatedRequest, res: Response) => {
  return res.json(db.plans);
});

// Create or update subscription plan
router.post('/plans', (req: AuthenticatedRequest, res: Response) => {
  const {
    id,
    name,
    key,
    description,
    price,
    currency = 'EUR',
    billingPeriod = 'monthly',
    trialDays = 0,
    maxAgents = 1,
    maxPagesPerAgent = 1,
    maxPostsPerWeek = 7,
    maxPostsPerDay = 1,
    canEditVisualPrompt = false,
    canEditProposals = true,
    canDeepCustomize = false,
    aiTokenMonthlyQuota = 50000,
    isActive = true,
  } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Le nom et le tarif sont requis.' });
  }

  const nowIso = new Date().toISOString();

  if (id) {
    // Update existing
    const plan = db.plans.find((p) => p.id === id);
    if (!plan) return res.status(404).json({ error: 'Pack introuvable.' });

    Object.assign(plan, {
      name,
      description,
      price: Number(price),
      currency,
      billingPeriod,
      trialDays: Number(trialDays),
      maxAgents: Number(maxAgents),
      maxPagesPerAgent: Number(maxPagesPerAgent),
      maxPostsPerWeek: Number(maxPostsPerWeek),
      maxPostsPerDay: Number(maxPostsPerDay),
      canEditVisualPrompt: Boolean(canEditVisualPrompt),
      canEditProposals: Boolean(canEditProposals),
      canDeepCustomize: Boolean(canDeepCustomize),
      aiTokenMonthlyQuota: Number(aiTokenMonthlyQuota),
      isActive: Boolean(isActive),
    });

    db.persist();
    return res.json({ plan, message: 'Pack mis à jour avec succès.' });
  } else {
    // Create new
    const newPlan: SubscriptionPlan = {
      id: `plan_${Date.now()}`,
      key: key || 'custom',
      name,
      description: description || '',
      price: Number(price),
      currency,
      billingPeriod,
      trialDays: Number(trialDays),
      maxAgents: Number(maxAgents),
      maxPagesPerAgent: Number(maxPagesPerAgent),
      maxPostsPerWeek: Number(maxPostsPerWeek),
      maxPostsPerDay: Number(maxPostsPerDay),
      canEditVisualPrompt: Boolean(canEditVisualPrompt),
      canEditProposals: Boolean(canEditProposals),
      canDeepCustomize: Boolean(canDeepCustomize),
      aiTokenMonthlyQuota: Number(aiTokenMonthlyQuota),
      isActive: Boolean(isActive),
      createdAt: nowIso,
    };

    db.plans.push(newPlan);
    db.persist();
    return res.status(201).json({ plan: newPlan, message: 'Pack créé avec succès.' });
  }
});

// List AI providers
router.get('/ai-providers', (req: AuthenticatedRequest, res: Response) => {
  const sanitized = db.aiProviders.map(({ encryptedApiKey, ...rest }) => ({
    ...rest,
    hasApiKey: Boolean(encryptedApiKey),
  }));
  return res.json(sanitized);
});

// Update AI provider configuration
router.put('/ai-providers/:id', (req: AuthenticatedRequest, res: Response) => {
  const provider = db.aiProviders.find((p) => p.id === req.params.id);
  if (!provider) return res.status(404).json({ error: 'Fournisseur d’IA introuvable.' });

  const { apiKey, baseUrl, defaultModel, status, priority, isDefault, supportedCapabilities } = req.body;

  if (apiKey !== undefined && apiKey.trim() !== '') {
    provider.encryptedApiKey = encryptSecret(apiKey.trim());
    provider.hasApiKey = true;
  }
  if (baseUrl !== undefined) provider.baseUrl = baseUrl;
  if (defaultModel !== undefined) provider.defaultModel = defaultModel;
  if (status !== undefined) provider.status = status;
  if (priority !== undefined) provider.priority = Number(priority);
  if (Array.isArray(supportedCapabilities)) provider.supportedCapabilities = supportedCapabilities;

  if (isDefault) {
    for (const p of db.aiProviders) p.isDefault = false;
    provider.isDefault = true;
  }

  provider.updatedAt = new Date().toISOString();
  db.persist();

  return res.json({ message: 'Configuration du fournisseur IA enregistrée avec succès.' });
});

// System Audit Logs & Job Queue
router.get('/logs', (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    auditLogs: db.auditLogs.slice(-100).reverse(),
    aiUsageLogs: db.aiUsageLogs.slice(-100).reverse(),
    scheduledJobs: db.scheduledJobs.slice(-100).reverse(),
    publicationAttempts: db.attempts.slice(-50).reverse(),
  });
});

export default router;
