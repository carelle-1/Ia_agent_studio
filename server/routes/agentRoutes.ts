import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, requireAuth, checkPlanLimits } from '../middleware.js';
import { Agent, AgentConfigurationVersion, AgentInstruction } from '../types.js';

const router = Router();

// List all user's agents with assigned pages
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const agents = db.agents.filter((a) => a.userId === userId && a.status !== 'archived');

  const populated = agents.map((agent) => {
    const assignments = db.assignments.filter((as) => as.agentId === agent.id);
    const assignedPageIds = assignments.map((as) => as.pageId);
    const assignedPages = db.socialPages.filter((p) => assignedPageIds.includes(p.id));
    const instructionsCount = db.agentInstructions.filter((i) => i.agentId === agent.id && i.isActive).length;
    const postsCount = db.posts.filter((p) => p.agentId === agent.id).length;

    return {
      ...agent,
      assignedPages,
      instructionsCount,
      postsCount,
    };
  });

  return res.json(populated);
});

// List agent templates (agents created by superadmins, available for users to base their domain on)
router.get('/templates', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const templates = db.agents
    .filter((a) => a.status !== 'archived')
    .map((a) => ({
      id: a.id,
      name: a.name,
      businessDomain: a.businessDomain,
      description: a.description,
      tone: a.tone,
      communicationStyle: a.communicationStyle,
      targetAudience: a.targetAudience,
      skills: a.skills,
      avatarUrl: a.avatarUrl,
    }));

  return res.json(templates);
});

// Create new agent with quota validation
router.post('/', requireAuth, checkPlanLimits('create_agent'), (req: AuthenticatedRequest, res: Response) => {
  const userId = req.body.userId || req.user!.id;

  // Seul un superadmin peut créer un agent pour un autre utilisateur
  if (req.body.userId && req.user!.role !== 'superadmin') {
    return res.status(403).json({ error: 'Seul un super administrateur peut créer un agent pour un autre utilisateur.' });
  }

  const targetUser = db.users.find((u) => u.id === userId);
  if (!targetUser) {
    return res.status(404).json({ error: 'Utilisateur cible introuvable.' });
  }

  const {
    name,
    avatarUrl,
    description,
    primaryGoal,
    businessDomain,
    associatedCompany,
    workingLanguage = 'fr',
    tone = 'Professionnel et inspirant',
    communicationStyle = 'Clair et percutant',
    targetAudience,
    skills = [],
    businessKnowledge = '',
    customInstructions = '',
    mandatoryRules = 'Validation humaine obligatoire avant toute publication.',
    topicsToAvoid = '',
    postingFrequency = 'daily',
    visualPreferences = 'Élégant, haute résolution, lumière naturelle.',
    autonomyLevel = 'supervised',
  } = req.body;

  if (!name || !businessDomain) {
    return res.status(400).json({ error: 'Le nom de l’agent et son domaine d’activité sont requis.' });
  }

  const now = new Date().toISOString();
  const agentId = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const newAgent: Agent = {
    id: agentId,
    userId,
    name: name.trim(),
    avatarUrl:
      avatarUrl ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    description: description || `Agent spécialisé en ${businessDomain}`,
    primaryGoal: primaryGoal || 'Accroître la visibilité et engager la communauté avec des publications régulières.',
    businessDomain: businessDomain.trim(),
    associatedCompany: associatedCompany || targetUser.companyName,
    workingLanguage: workingLanguage === 'en' ? 'en' : 'fr',
    tone,
    communicationStyle,
    targetAudience: targetAudience || 'Clients potentiels et communauté cible',
    skills: Array.isArray(skills) && skills.length > 0 ? skills : ['Rédaction commerciale', 'Storytelling', 'Veille de tendances'],
    businessKnowledge,
    customInstructions,
    mandatoryRules,
    topicsToAvoid,
    postingFrequency,
    visualPreferences,
    autonomyLevel,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  db.agents.push(newAgent);

  // Record initial version 1
  const version1: AgentConfigurationVersion = {
    id: `ver_${Date.now()}`,
    agentId: newAgent.id,
    versionNumber: 1,
    snapshotData: newAgent,
    reason: 'Création initiale de l’agent',
    createdAt: now,
  };
  db.agentVersions.push(version1);

  db.auditLogs.push({
    id: `audit_${Date.now()}`,
    userId,
    userEmail: req.user!.email,
    action: 'AGENT_CREATED',
    entityType: 'Agent',
    entityId: newAgent.id,
    details: `Création de l'agent "${newAgent.name}"`,
    timestamp: now,
  });

  db.persist();

  return res.status(201).json(newAgent);
});

// Get agent detail
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const agent = db.agents.find((a) => a.id === req.params.id && a.userId === userId);
  if (!agent) {
    return res.status(404).json({ error: 'Agent introuvable.' });
  }

  const instructions = db.agentInstructions.filter((i) => i.agentId === agent.id);
  const versions = db.agentVersions.filter((v) => v.agentId === agent.id).sort((a, b) => b.versionNumber - a.versionNumber);
  const assignments = db.assignments.filter((as) => as.agentId === agent.id);
  const assignedPages = db.socialPages.filter((p) => assignments.some((as) => as.pageId === p.id));

  return res.json({
    ...agent,
    instructions,
    versions,
    assignedPages,
  });
});

// Update agent with version history tracking
router.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const agent = db.agents.find((a) => a.id === req.params.id && a.userId === userId);
  if (!agent) {
    return res.status(404).json({ error: 'Agent introuvable.' });
  }

  const { reason = 'Mise à jour de la configuration', ...updates } = req.body;

  // Snapshot current state before modifying
  const existingVersions = db.agentVersions.filter((v) => v.agentId === agent.id);
  const nextVer = existingVersions.length + 1;

  const versionSnapshot: AgentConfigurationVersion = {
    id: `ver_${Date.now()}`,
    agentId: agent.id,
    versionNumber: nextVer,
    snapshotData: { ...agent },
    reason,
    createdAt: new Date().toISOString(),
  };
  db.agentVersions.push(versionSnapshot);

  // Apply updates
  Object.assign(agent, updates);
  agent.updatedAt = new Date().toISOString();
  db.persist();

  return res.json({ agent, message: 'Agent mis à jour et version archivée avec succès.' });
});

// Archive agent
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const agent = db.agents.find((a) => a.id === req.params.id && a.userId === userId);
  if (!agent) {
    return res.status(404).json({ error: 'Agent introuvable.' });
  }

  agent.status = 'archived';
  agent.updatedAt = new Date().toISOString();

  // Remove assignments
  const keepAssignments = db.assignments.filter((as) => as.agentId !== agent.id);
  db.assignments.length = 0;
  db.assignments.push(...keepAssignments);

  db.persist();
  return res.json({ success: true, message: 'Agent archivé avec succès.' });
});

// List instructions for agent
router.get('/:id/instructions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const agent = db.agents.find((a) => a.id === req.params.id && a.userId === userId);
  if (!agent) return res.status(404).json({ error: 'Agent introuvable.' });

  const instructions = db.agentInstructions.filter((i) => i.agentId === agent.id);
  return res.json(instructions);
});

// Add instruction for agent
router.post('/:id/instructions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const agent = db.agents.find((a) => a.id === req.params.id && a.userId === userId);
  if (!agent) return res.status(404).json({ error: 'Agent introuvable.' });

  const { category = 'general', title, content, expiresAt } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Le titre et le contenu de l’instruction sont obligatoires.' });
  }

  const instruction: AgentInstruction = {
    id: `instr_${Date.now()}`,
    agentId: agent.id,
    userId,
    category,
    title: title.trim(),
    content: content.trim(),
    expiresAt,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  db.agentInstructions.push(instruction);
  db.persist();

  return res.status(201).json(instruction);
});

// Delete or toggle instruction
router.delete('/:id/instructions/:instructionId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const idx = db.agentInstructions.findIndex(
    (i) => i.id === req.params.instructionId && i.agentId === req.params.id && i.userId === userId
  );

  if (idx === -1) return res.status(404).json({ error: 'Instruction introuvable.' });

  db.agentInstructions.splice(idx, 1);
  db.persist();

  return res.json({ success: true, message: 'Instruction supprimée.' });
});

// Rollback agent to previous version
router.post('/:id/rollback', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const agent = db.agents.find((a) => a.id === req.params.id && a.userId === userId);
  if (!agent) return res.status(404).json({ error: 'Agent introuvable.' });

  const { versionNumber } = req.body;
  const targetVer = db.agentVersions.find((v) => v.agentId === agent.id && v.versionNumber === versionNumber);
  if (!targetVer) {
    return res.status(404).json({ error: 'Version introuvable pour cet agent.' });
  }

  // Restore snapshot fields
  Object.assign(agent, targetVer.snapshotData);
  agent.updatedAt = new Date().toISOString();
  db.persist();

  return res.json({
    agent,
    message: `Agent restauré avec succès vers la version #${versionNumber}.`,
  });
});

export default router;
