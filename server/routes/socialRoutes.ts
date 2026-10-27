import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, requireAuth, checkPlanLimits } from '../middleware.js';
import { metaService } from '../services/metaService.js';
import { encryptSecret } from '../security.js';
import { SocialAccount, SocialPage } from '../types.js';

const router = Router();

interface OAuthState {
  userId: string;
  accountId?: string;
}

interface MetaPageData {
  id: string;
  name: string;
  category?: string;
  picture?: { data?: { url?: string } };
  followers_count?: number;
  fan_count?: number;
  access_token: string;
}

async function fetchMetaPages(accessToken: string): Promise<MetaPageData[]> {
  const fields = 'id,name,category,picture{url},followers_count,fan_count,access_token';
  let nextUrl: string | null = `https://graph.facebook.com/v21.0/me/accounts?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`;
  const pages: MetaPageData[] = [];

  while (nextUrl) {
    const response = await fetch(nextUrl);
    const result = await response.json() as {
      data?: MetaPageData[];
      paging?: { next?: string };
      error?: { message?: string };
    };

    if (!response.ok || result.error) {
      throw new Error(result.error?.message || 'Impossible de récupérer les pages Facebook autorisées.');
    }

    pages.push(...(result.data || []));
    nextUrl = result.paging?.next || null;
  }

  return pages;
}

const oAuthStates = new Map<string, OAuthState>();

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';

// List user's social accounts
router.get('/accounts', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const accounts = db.socialAccounts.filter((a) => a.userId === userId);

  // Strip sensitive encrypted token from response
  const sanitized = accounts.map(({ encryptedAccessToken, ...rest }) => ({
    ...rest,
    hasToken: Boolean(encryptedAccessToken),
  }));

  return res.json(sanitized);
});

// List user's social pages with assigned agent info
router.get('/pages', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const pages = db.socialPages.filter((p) => p.userId === userId);

  const populated = pages.map((page) => {
    const assignment = db.assignments.find((a) => a.pageId === page.id);
    const assignedAgent = assignment ? db.agents.find((ag) => ag.id === assignment.agentId) : null;
    const { encryptedAccessToken, ...safePage } = page;
    return {
      ...safePage,
      assignedAgent,
      assignmentId: assignment?.id,
    };
  });

  return res.json(populated);
});

// Test connection on server-side
router.post('/test-connection', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { accountId, pageId } = req.body;

  const account = db.socialAccounts.find((a) => a.id === accountId && a.userId === userId);
  if (!account) {
    return res.status(404).json({ error: 'Compte social introuvable.' });
  }

  const page = pageId ? db.socialPages.find((p) => p.id === pageId && p.userId === userId) : undefined;

  const result = await metaService.testConnection(account, page);
  return res.json(result);
});

// Connect Facebook / Instagram sandbox account
router.post('/connect-sandbox', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { platform = 'facebook', pageName, handle } = req.body;

  const now = new Date().toISOString();
  const token = encryptSecret(`EAAB_mock_meta_access_token_${platform}_${Date.now()}`);

  const accountId = `acc_${platform}_${Date.now()}`;
  const account: SocialAccount = {
    id: accountId,
    userId,
    platform: platform === 'instagram' ? 'instagram' : 'facebook',
    externalUserId: `${Math.floor(100000000000000 + Math.random() * 900000000000000)}`,
    name: platform === 'facebook'
      ? `${pageName || req.user!.companyName} (Meta Business)`
      : `@${handle || req.user!.companyName.toLowerCase().replace(/\s+/g, '_')} (Instagram Pro)`,
    encryptedAccessToken: token,
    tokenExpiresAt: new Date(Date.now() + 60 * 86400000).toISOString(),
    scopes:
      platform === 'facebook'
        ? ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'read_insights']
        : ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights'],
    status: 'connected',
    lastCheckedAt: now,
    createdAt: now,
  };
  db.socialAccounts.push(account);

  const pageId = `page_${platform}_${Date.now()}`;
  const page: SocialPage = {
    id: pageId,
    userId,
    socialAccountId: account.id,
    platform: account.platform,
    externalPageId: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    name: pageName || (platform === 'facebook' ? req.user!.companyName : `@${handle || req.user!.companyName.toLowerCase()}`),
    category: platform === 'facebook' ? 'Entreprise locale & Services' : 'Créateur de contenu / Entreprise',
    profilePictureUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=120&auto=format&fit=crop&q=80',
    followersCount: Math.floor(1200 + Math.random() * 15000),
    timeZone: 'Europe/Paris',
    targetAudience: 'Clients et communauté francophone',
    editorialGuidelines: 'Publications de haute qualité, ton respectueux et engageant.',
    preferredHours: ['09:00', '12:30', '18:45'],
    status: 'active',
    createdAt: now,
  };
  db.socialPages.push(page);

  db.persist();

  return res.status(201).json({
    account,
    page,
    message: `Page ${platform === 'facebook' ? 'Facebook' : 'Instagram'} connectée avec succès en mode sécurisé.`,
  });
});

// Générer l'URL d'autorisation Meta OAuth (Facebook)
router.get('/oauth/facebook', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
  if (accountId) {
    const account = db.socialAccounts.find((item) => item.id === accountId && item.userId === userId);
    if (!account || account.platform !== 'facebook') {
      return res.status(404).json({ error: 'Compte Facebook introuvable.' });
    }
  }

  const state = `fb_oauth_${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  oAuthStates.set(state, { userId, accountId });
  const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/social/oauth/facebook/callback`;
  const url = metaService.getOAuthUrl(redirectUri, state);
  return res.json({ url });
});

// Callback Meta OAuth (redirection depuis Facebook après autorisation utilisateur)
router.get('/oauth/facebook/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query as { code?: string; state?: string; error?: string };

  if (error || !state) {
    return res.redirect(`${FRONTEND_URL}/social?error=oauth_denied`);
  }

  const oauthState = oAuthStates.get(state);
  oAuthStates.delete(state);
  if (!oauthState) {
    return res.redirect(`${FRONTEND_URL}/social?error=invalid_state`);
  }
  const { userId, accountId } = oauthState;

  const appId = process.env.META_APP_ID || '123456789012345';
  const appSecret = process.env.META_APP_SECRET || '';
  const redirectUri = `${req.protocol}://${req.get('host')}/api/social/oauth/facebook/callback`;

  // Échange du code d'autorisation contre un jeton d'accès de courte durée
  let accessToken = '';
  let longLivedToken = '';
  let expiresIn = 0;

  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return res.redirect(`${FRONTEND_URL}/social?error=token_exchange_failed`);
    }
    accessToken = tokenData.access_token;
    expiresIn = tokenData.expires_in || 0;

    // Échange du jeton courte durée contre un jeton longue durée (60 jours)
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`
    );
    const longLivedData = await longLivedRes.json();
    if (longLivedData.error) {
      return res.redirect(`${FRONTEND_URL}/social?error=long_lived_token_failed`);
    }
    longLivedToken = longLivedData.access_token;
    expiresIn = longLivedData.expires_in || 60 * 86400;
  } catch {
    return res.redirect(`${FRONTEND_URL}/social?error=token_exchange_failed`);
  }

  let profile: { id: string; name: string; picture?: { data?: { url?: string } } };
  let facebookPages: MetaPageData[];
  try {
    const profileUrl = new URL('https://graph.facebook.com/v21.0/me');
    profileUrl.searchParams.set('fields', 'id,name,picture');
    profileUrl.searchParams.set('access_token', longLivedToken || accessToken);
    const profileResponse = await fetch(profileUrl);
    const profileResult = await profileResponse.json() as typeof profile & { error?: { message?: string } };
    if (!profileResponse.ok || profileResult.error || !profileResult.id) {
      return res.redirect(`${FRONTEND_URL}/social?error=profile_fetch_failed`);
    }
    profile = profileResult;
    facebookPages = await fetchMetaPages(longLivedToken || accessToken);
  } catch (error) {
    console.error('Failed to retrieve Facebook profile or pages:', error);
    return res.redirect(`${FRONTEND_URL}/social?error=pages_fetch_failed`);
  }

  // Store the real Facebook profile, access token and authorized pages.
  const now = new Date().toISOString();
  const token = encryptSecret(longLivedToken || accessToken);
  let account = accountId
    ? db.socialAccounts.find((item) => item.id === accountId && item.userId === userId)
    : db.socialAccounts.find((item) => item.userId === userId && item.platform === 'facebook' && item.externalUserId === profile.id);

  if (!account) {
    account = {
      id: `acc_facebook_oauth_${Date.now()}`,
      userId,
      platform: 'facebook',
      externalUserId: profile.id,
      name: profile.name,
      encryptedAccessToken: token,
      scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'read_insights'],
      status: 'connected',
      lastCheckedAt: now,
      createdAt: now,
    };
    db.socialAccounts.push(account);
  } else {
    account.externalUserId = profile.id;
    account.name = profile.name;
    account.encryptedAccessToken = token;
    account.status = 'connected';
    account.lastCheckedAt = now;
    account.lastError = undefined;
  }
  account.profilePictureUrl = profile.picture?.data?.url;
  account.tokenExpiresAt = new Date(Date.now() + (expiresIn || 60 * 86400) * 1000).toISOString();

  const existingPages = db.socialPages.filter(
    (page) => page.userId === userId && page.socialAccountId === account.id,
  );
  for (const existingPage of existingPages) {
    existingPage.status = 'disconnected';
  }

  for (const facebookPage of facebookPages) {
    let page = existingPages.find((existing) => existing.externalPageId === facebookPage.id);
    if (!page) {
      page = {
        id: `page_facebook_${facebookPage.id}`,
        userId,
        socialAccountId: account.id,
        platform: 'facebook',
        externalPageId: facebookPage.id,
        name: facebookPage.name,
        category: facebookPage.category || 'Entreprise',
        followersCount: 0,
        timeZone: 'Europe/Paris',
        targetAudience: 'Communauté francophone',
        editorialGuidelines: 'Publications de haute qualité, ton respectueux et engageant.',
        preferredHours: ['09:00', '12:30', '18:45'],
        status: 'active',
        createdAt: now,
      };
      db.socialPages.push(page);
    }

    page.name = facebookPage.name;
    page.category = facebookPage.category || page.category;
    page.profilePictureUrl = facebookPage.picture?.data?.url;
    page.followersCount = facebookPage.followers_count ?? facebookPage.fan_count ?? 0;
    page.encryptedAccessToken = encryptSecret(facebookPage.access_token);
    page.status = 'active';
  }

  db.persist();

  const result = new URL('/social', FRONTEND_URL);
  result.searchParams.set('connected', 'facebook');
  if (facebookPages.length === 0) result.searchParams.set('error', 'no_pages');
  return res.redirect(result.toString());
});

// Assign an agent to a page (with quota check)
router.post('/assign', requireAuth, checkPlanLimits('assign_page'), (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { agentId, pageId } = req.body;

  if (!agentId || !pageId) {
    return res.status(400).json({ error: 'Agent et Page requis pour l’affectation.' });
  }

  const agent = db.agents.find((a) => a.id === agentId && a.userId === userId);
  const page = db.socialPages.find((p) => p.id === pageId && p.userId === userId);

  if (!agent || !page) {
    return res.status(404).json({ error: 'Agent ou Page introuvable.' });
  }

  // Check if page already has an assignment; if so, replace it
  const existingIndex = db.assignments.findIndex((as) => as.pageId === page.id && as.userId === userId);
  if (existingIndex !== -1) {
    db.assignments[existingIndex].agentId = agent.id;
    db.assignments[existingIndex].assignedAt = new Date().toISOString();
  } else {
    db.assignments.push({
      id: `assign_${Date.now()}`,
      agentId: agent.id,
      pageId: page.id,
      userId,
      assignedAt: new Date().toISOString(),
    });
  }

  db.persist();

  return res.json({
    success: true,
    message: `L'agent ${agent.name} a été affecté à la page ${page.name}.`,
  });
});

// Unassign an agent from a page
router.delete('/assign/:assignmentId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const idx = db.assignments.findIndex((as) => as.id === req.params.assignmentId && as.userId === userId);

  if (idx === -1) {
    return res.status(404).json({ error: 'Affectation introuvable.' });
  }

  db.assignments.splice(idx, 1);
  db.persist();

  return res.json({ success: true, message: 'Affectation retirée avec succès.' });
});

// Disconnect account and related pages (soft disconnect: status only, pages stay visible)
router.post('/accounts/:id/disconnect', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const accIndex = db.socialAccounts.findIndex((a) => a.id === req.params.id && a.userId === userId);

  if (accIndex === -1) {
    return res.status(404).json({ error: 'Compte social introuvable.' });
  }

  const now = new Date().toISOString();
  const account = db.socialAccounts[accIndex];
  account.status = 'disconnected';
  account.lastCheckedAt = now;

  // Mettre les pages liées en statut déconnecté (elles restent affichées)
  db.socialPages.forEach((p) => {
    if (p.socialAccountId === account.id) {
      p.status = 'disconnected';
    }
  });

  db.persist();

  return res.json({ success: true, message: 'Compte déconnecté avec succès. Vos pages restent visibles.' });
});

// Delete a social account and all its related pages and assignments (hard delete)
router.delete('/accounts/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const accIndex = db.socialAccounts.findIndex((a) => a.id === req.params.id && a.userId === userId);

  if (accIndex === -1) {
    return res.status(404).json({ error: 'Compte social introuvable.' });
  }

  const account = db.socialAccounts[accIndex];
  db.socialAccounts.splice(accIndex, 1);

  // Remove related pages
  const pageIdsToRemove: string[] = [];
  db.socialPages = db.socialPages.filter((p) => {
    if (p.socialAccountId === account.id) {
      pageIdsToRemove.push(p.id);
      return false;
    }
    return true;
  });

  // Remove assignments for those pages
  db.assignments = db.assignments.filter((as) => !pageIdsToRemove.includes(as.pageId));

  db.persist();

  return res.json({ success: true, message: 'Compte et pages supprimés avec succès.' });
});

// Reconnect a social account (set status back to connected with a fresh sandbox token)
router.post('/accounts/:id/reconnect', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const accIndex = db.socialAccounts.findIndex((a) => a.id === req.params.id && a.userId === userId);

  if (accIndex === -1) {
    return res.status(404).json({ error: 'Compte social introuvable.' });
  }

  const now = new Date().toISOString();
  const account = db.socialAccounts[accIndex];
  if (account.platform === 'facebook') {
    return res.status(400).json({
      error: 'La reconnexion Facebook doit être autorisée par Meta. Utilisez le bouton « Se connecter » pour renouveler les autorisations.',
    });
  }

  const token = encryptSecret(`EAAB_reconnect_${account.platform}_${Date.now()}`);

  account.status = 'connected';
  account.encryptedAccessToken = token;
  account.tokenExpiresAt = new Date(Date.now() + 60 * 86400000).toISOString();
  account.lastCheckedAt = now;
  account.lastError = undefined;
  db.socialPages.forEach((page) => {
    if (page.socialAccountId === account.id) page.status = 'active';
  });

  db.persist();

  return res.json({ success: true, message: `Compte ${account.name} reconnecté avec succès.` });
});

export default router;
