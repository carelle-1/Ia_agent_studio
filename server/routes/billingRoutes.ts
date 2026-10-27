import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, requireAuth } from '../middleware.js';
import { Payment } from '../types.js';

const router = Router();

// Get public subscription plans
router.get('/plans', (req, res: Response) => {
  const activePlans = db.plans.filter((p) => p.isActive);
  return res.json(activePlans);
});

// Get user current subscription & usage
router.get('/subscription', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const subscription = db.subscriptions.find((s) => s.userId === userId && s.status !== 'canceled');
  const plan = subscription ? db.plans.find((p) => p.id === subscription.planId) : null;
  const usage = db.usages.find((u) => u.userId === userId);
  const payments = db.payments.filter((p) => p.userId === userId);

  return res.json({
    subscription,
    plan,
    usage,
    payments,
  });
});

// Change / upgrade plan
router.post('/change-plan', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { planId, paymentMethod = 'Carte bancaire (Sandbox)' } = req.body;

  const targetPlan = db.plans.find((p) => p.id === planId && p.isActive);
  if (!targetPlan) {
    return res.status(404).json({ error: 'Forfait introuvable ou inactif.' });
  }

  let sub = db.subscriptions.find((s) => s.userId === userId && s.status !== 'canceled');
  const nowIso = new Date().toISOString();
  const periodEnd = new Date(Date.now() + 30 * 86400000).toISOString();

  if (!sub) {
    sub = {
      id: `sub_${Date.now()}`,
      userId,
      planId: targetPlan.id,
      status: targetPlan.trialDays > 0 ? 'trialing' : 'active',
      startDate: nowIso,
      currentPeriodEnd: periodEnd,
      autoRenew: true,
      paymentMethod,
      updatedAt: nowIso,
    };
    db.subscriptions.push(sub);
  } else {
    sub.planId = targetPlan.id;
    sub.status = 'active';
    sub.currentPeriodEnd = periodEnd;
    sub.paymentMethod = paymentMethod;
    sub.updatedAt = nowIso;
  }

  // Create payment receipt if paid plan
  if (targetPlan.price > 0) {
    const payment: Payment = {
      id: `pay_${Date.now()}`,
      userId,
      subscriptionId: sub.id,
      amount: targetPlan.price,
      currency: targetPlan.currency,
      status: 'succeeded',
      provider: 'stripe_sandbox',
      transactionId: `txn_sim_${Date.now()}`,
      receiptUrl: '#',
      createdAt: nowIso,
    };
    db.payments.push(payment);
  }

  // Notification
  db.notifications.push({
    id: `notif_${Date.now()}`,
    userId,
    type: 'subscription_update',
    title: 'Abonnement mis à jour !',
    message: `Votre abonnement est désormais actif sur le ${targetPlan.name}. Profitez de vos nouveaux quotas et fonctionnalités.`,
    link: '/billing',
    read: false,
    createdAt: nowIso,
  });

  db.auditLogs.push({
    id: `audit_${Date.now()}`,
    userId,
    userEmail: req.user!.email,
    action: 'SUBSCRIPTION_CHANGED',
    entityType: 'Subscription',
    entityId: sub.id,
    details: `Passage au forfait "${targetPlan.name}" (${targetPlan.price} ${targetPlan.currency}/mois)`,
    timestamp: nowIso,
  });

  db.persist();

  return res.json({
    subscription: sub,
    plan: targetPlan,
    message: `Félicitations ! Vous êtes maintenant abonné au ${targetPlan.name}.`,
  });
});

export default router;
