import { Router, Response } from 'express';
import { db } from '../db.js';
import { hashPassword, verifyPassword, generateToken, sanitizeUser } from '../security.js';
import { AuthenticatedRequest, requireAuth } from '../middleware.js';
import { User, Session } from '../types.js';

const router = Router();

async function persistAuthChanges(res: Response) {
  try {
    await db.persistAndWait();
    return true;
  } catch (error) {
    console.error('Failed to persist authentication data:', error);
    res.status(500).json({ error: 'Impossible d’enregistrer vos informations. Veuillez réessayer.' });
    return false;
  }
}

// Register new user
router.post('/register', async (req, res: Response) => {
  const {
    firstName,
    lastName,
    companyName,
    email,
    phone,
    password,
    passwordConfirm,
    country,
    city,
    preferredLanguage = 'fr',
  } = req.body;

  // Validation
  if (!email || !password || !firstName || !lastName || !companyName) {
    return res.status(400).json({ error: 'Tous les champs obligatoires doivent être renseignés.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit comporter au moins 8 caractères.' });
  }

  if (passwordConfirm && password !== passwordConfirm) {
    return res.status(400).json({ error: 'La confirmation du mot de passe ne correspond pas.' });
  }

  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Une entreprise avec cette adresse email existe déjà.' });
  }

  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();
  const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const newUser: User = {
    id: userId,
    email: email.toLowerCase().trim(),
    passwordHash: hash,
    salt,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    companyName: companyName.trim(),
    phone: phone?.trim(),
    country: country || 'France',
    city: city || 'Paris',
    preferredLanguage: preferredLanguage === 'en' ? 'en' : 'fr',
    role: 'user',
    status: 'active',
    emailVerified: false,
    createdAt: now,
    updatedAt: now,
  };

  db.users.push(newUser);

  // Assign Free Test plan by default with 7-day trial
  const freePlan = db.plans.find((p) => p.key === 'free_test') || db.plans[0];
  const trialEnds = new Date(Date.now() + 7 * 86400000).toISOString();

  const subId = `sub_${Date.now()}`;
  db.subscriptions.push({
    id: subId,
    userId: newUser.id,
    planId: freePlan.id,
    status: 'trialing',
    startDate: now,
    trialEndsAt: trialEnds,
    currentPeriodEnd: trialEnds,
    autoRenew: false,
    updatedAt: now,
  });

  // Init usage tracker
  db.usages.push({
    id: `usage_${Date.now()}`,
    userId: newUser.id,
    subscriptionId: subId,
    periodStart: now,
    periodEnd: trialEnds,
    postsCreatedCount: 0,
    postsPublishedCount: 0,
    aiTokensUsed: 0,
    estimatedAiCostEur: 0,
  });

  // Create default Brand Profile
  db.brandProfiles.push({
    id: `bp_${Date.now()}`,
    userId: newUser.id,
    brandName: newUser.companyName,
    primaryColor: '#2563EB',
    secondaryColor: '#7C3AED',
    accentColor: '#10B981',
    fontTitle: 'Plus Jakarta Sans',
    fontBody: 'Inter',
    brandVoice: 'Professionnel, authentique et inspirant.',
    visualStyle: 'Moderne, lumineux et soigné.',
    negativePrompts: 'Flou, basse qualité, déformations.',
    doNotMention: 'Prix discount, polémiques.',
    guidelines: 'Valoriser la qualité et l’écoute client.',
    createdAt: now,
    updatedAt: now,
  });

  // Welcome notification
  db.notifications.push({
    id: `notif_${Date.now()}`,
    userId: newUser.id,
    type: 'subscription_update',
    title: 'Bienvenue sur Meta Colab !',
    message: 'Votre période d’essai de 7 jours (Pack Free Test) est activée. Créez votre premier agent IA pour démarrer !',
    link: '/agents',
    read: false,
    createdAt: now,
  });

  // Create initial session
  const token = generateToken(32);
  const sessionExpiresAt = new Date(Date.now() + 14 * 86400000).toISOString(); // 14 days
  const session: Session = {
    id: `sess_${Date.now()}`,
    userId: newUser.id,
    token,
    expiresAt: sessionExpiresAt,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    createdAt: now,
  };
  db.sessions.push(session);

  // Audit
  db.auditLogs.push({
    id: `audit_${Date.now()}`,
    userId: newUser.id,
    userEmail: newUser.email,
    action: 'USER_REGISTERED',
    entityType: 'User',
    entityId: newUser.id,
    details: `Inscription de ${newUser.email} avec le Pack Free Test`,
    ipAddress: req.ip,
    timestamp: now,
  });

  if (!(await persistAuthChanges(res))) return;

  return res.status(201).json({
    user: sanitizeUser(newUser),
    token,
    plan: freePlan,
    message: 'Inscription réussie.',
  });
});

// Login
router.post('/login', async (req, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Veuillez saisir votre email et votre mot de passe.' });
  }

  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Ce compte a été suspendu par l’administration. Veuillez contacter le support.' });
  }

  const isValid = verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }

  const token = generateToken(32);
  const sessionExpiresAt = new Date(Date.now() + 14 * 86400000).toISOString();
  const session: Session = {
    id: `sess_${Date.now()}`,
    userId: user.id,
    token,
    expiresAt: sessionExpiresAt,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    createdAt: new Date().toISOString(),
  };

  db.sessions.push(session);
  if (!(await persistAuthChanges(res))) return;

  const sub = db.subscriptions.find((s) => s.userId === user.id && s.status !== 'canceled');
  const plan = sub ? db.plans.find((p) => p.id === sub.planId) : null;

  return res.json({
    user: sanitizeUser(user),
    token,
    subscription: sub,
    plan,
    message: 'Connexion réussie.',
  });
});

// Logout
router.post('/logout', async (req: AuthenticatedRequest, res: Response) => {
  if (req.sessionToken) {
    const idx = db.sessions.findIndex((s) => s.token === req.sessionToken);
    if (idx !== -1) {
      db.sessions.splice(idx, 1);
      if (!(await persistAuthChanges(res))) return;
    }
  }
  return res.json({ success: true, message: 'Déconnexion effectuée.' });
});

// Get current user session
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const sub = db.subscriptions.find((s) => s.userId === user.id && s.status !== 'canceled');
  const plan = sub ? db.plans.find((p) => p.id === sub.planId) : null;
  const usage = db.usages.find((u) => u.userId === user.id);

  return res.json({
    user: sanitizeUser(user),
    subscription: sub,
    plan,
    usage,
  });
});

// Update profile
router.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { firstName, lastName, companyName, phone, country, city, avatarUrl, preferredLanguage } = req.body;

  if (firstName) user.firstName = firstName.trim();
  if (lastName) user.lastName = lastName.trim();
  if (companyName) user.companyName = companyName.trim();
  if (phone !== undefined) user.phone = phone?.trim();
  if (country) user.country = country;
  if (city) user.city = city;
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
  if (preferredLanguage && (preferredLanguage === 'fr' || preferredLanguage === 'en')) {
    user.preferredLanguage = preferredLanguage;
  }
  user.updatedAt = new Date().toISOString();
  if (!(await persistAuthChanges(res))) return;

  return res.json({ user: sanitizeUser(user), message: 'Profil mis à jour avec succès.' });
});

// Update password
router.put('/security', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Veuillez saisir votre mot de passe actuel et le nouveau mot de passe.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit comporter au moins 8 caractères.' });
  }

  const isCurrentValid = verifyPassword(currentPassword, user.passwordHash, user.salt);
  if (!isCurrentValid) {
    return res.status(400).json({ error: 'Le mot de passe actuel est erroné.' });
  }

  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.salt = salt;
  user.updatedAt = new Date().toISOString();
  if (!(await persistAuthChanges(res))) return;

  return res.json({ success: true, message: 'Mot de passe modifié avec succès.' });
});

export default router;
