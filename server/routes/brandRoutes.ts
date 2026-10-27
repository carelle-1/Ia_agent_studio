import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, requireAuth } from '../middleware.js';
import { BrandProfile, InspirationAsset } from '../types.js';

const router = Router();

// Get brand profile
router.get('/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  let profile = db.brandProfiles.find((b) => b.userId === userId);

  if (!profile) {
    const nowIso = new Date().toISOString();
    profile = {
      id: `bp_${Date.now()}`,
      userId,
      brandName: req.user!.companyName,
      primaryColor: '#2563EB',
      secondaryColor: '#7C3AED',
      accentColor: '#10B981',
      fontTitle: 'Plus Jakarta Sans',
      fontBody: 'Inter',
      brandVoice: 'Professionnel, inspirant et soigné.',
      visualStyle: 'Moderne, lumineux et élégant.',
      negativePrompts: 'Flou, déformé, amateur, basse résolution.',
      doNotMention: 'Prix discount, polémiques.',
      guidelines: 'Respecter l’excellence et la réputation de la marque.',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    db.brandProfiles.push(profile);
    db.persist();
  }

  return res.json(profile);
});

// Update brand profile
router.put('/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  let profile = db.brandProfiles.find((b) => b.userId === userId);

  const nowIso = new Date().toISOString();
  if (!profile) {
    profile = {
      id: `bp_${Date.now()}`,
      userId,
      brandName: req.body.brandName || req.user!.companyName,
      primaryColor: req.body.primaryColor || '#2563EB',
      secondaryColor: req.body.secondaryColor || '#7C3AED',
      accentColor: req.body.accentColor || '#10B981',
      fontTitle: req.body.fontTitle || 'Plus Jakarta Sans',
      fontBody: req.body.fontBody || 'Inter',
      logoUrl: req.body.logoUrl || '',
      brandVoice: req.body.brandVoice || '',
      visualStyle: req.body.visualStyle || '',
      negativePrompts: req.body.negativePrompts || '',
      doNotMention: req.body.doNotMention || '',
      guidelines: req.body.guidelines || '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    db.brandProfiles.push(profile);
  } else {
    Object.assign(profile, req.body);
    profile.updatedAt = nowIso;
  }

  db.persist();
  return res.json({ profile, message: 'Identité de marque enregistrée avec succès.' });
});

// List inspiration gallery assets
router.get('/inspiration', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const assets = db.inspirationAssets.filter((a) => a.userId === userId);
  return res.json(assets);
});

// Add inspiration asset
router.post('/inspiration', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { title, description, category = 'lifestyle', tags = [], fileUrl, instructions, associatedAgentId, associatedPageId } = req.body;

  if (!title || !fileUrl) {
    return res.status(400).json({ error: 'Le titre et l’URL du fichier ou visuel sont requis.' });
  }

  const asset: InspirationAsset = {
    id: `insp_${Date.now()}`,
    userId,
    title: title.trim(),
    description: description || '',
    category,
    tags: Array.isArray(tags) ? tags : [],
    fileUrl,
    instructions: instructions || '',
    associatedAgentId,
    associatedPageId,
    createdAt: new Date().toISOString(),
  };

  db.inspirationAssets.push(asset);
  db.persist();

  return res.status(201).json({ asset, message: 'Élément ajouté à la galerie d’inspiration.' });
});

// Delete inspiration asset
router.delete('/inspiration/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const idx = db.inspirationAssets.findIndex((a) => a.id === req.params.id && a.userId === userId);

  if (idx === -1) {
    return res.status(404).json({ error: 'Élément introuvable.' });
  }

  db.inspirationAssets.splice(idx, 1);
  db.persist();

  return res.json({ success: true, message: 'Élément retiré de la galerie.' });
});

export default router;
