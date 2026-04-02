import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { store, StoredProfile, StoredPlan } from '../store';

const router = express.Router();

// ─── GET /api/profiles/:id ────────────────────────────────────────────────────
router.get('/:id', (req: Request, res: Response) => {
  const profile = store.getProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile);
});

// ─── POST /api/profiles ───────────────────────────────────────────────────────
router.post('/', (req: Request, res: Response) => {
  const { id, name, interests, budgetLevel } = req.body as Partial<StoredProfile>;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  const now = new Date().toISOString();
  const profile = store.upsertProfile({
    id: id ?? randomUUID(),
    name: name.trim(),
    interests: interests ?? [],
    budgetLevel: budgetLevel ?? 2,
    createdAt: id ? (store.getProfile(id)?.createdAt ?? now) : now,
    updatedAt: now,
  });
  res.json(profile);
});

// ─── PUT /api/profiles/:id ────────────────────────────────────────────────────
router.put('/:id', (req: Request, res: Response) => {
  const existing = store.getProfile(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Profile not found' });

  const { name, interests, budgetLevel } = req.body as Partial<StoredProfile>;
  const updated = store.upsertProfile({
    ...existing,
    name: name?.trim() ?? existing.name,
    interests: interests ?? existing.interests,
    budgetLevel: budgetLevel ?? existing.budgetLevel,
    updatedAt: new Date().toISOString(),
  });
  res.json(updated);
});

// ─── DELETE /api/profiles/:id ─────────────────────────────────────────────────
router.delete('/:id', (req: Request, res: Response) => {
  const ok = store.deleteProfile(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Profile not found' });
  res.json({ ok: true });
});

// ─── GET /api/profiles/:id/plans ─────────────────────────────────────────────
router.get('/:id/plans', (req: Request, res: Response) => {
  const profile = store.getProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(store.getPlansForProfile(req.params.id));
});

// ─── POST /api/profiles/:id/plans ────────────────────────────────────────────
router.post('/:id/plans', (req: Request, res: Response) => {
  const profile = store.getProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  const { id: planId, label, planData } = req.body as Partial<StoredPlan>;
  if (!planData) return res.status(400).json({ error: 'planData is required' });

  const now = new Date().toISOString();
  const saved = store.upsertPlan({
    id: planId ?? randomUUID(),
    profileId: req.params.id,
    label: label ?? 'My Trip',
    planData,
    createdAt: planId ? (store.getPlan(planId)?.createdAt ?? now) : now,
    updatedAt: now,
  });
  res.json(saved);
});

// ─── PUT /api/profiles/:id/plans/:pid ────────────────────────────────────────
router.put('/:id/plans/:pid', (req: Request, res: Response) => {
  const existing = store.getPlan(req.params.pid);
  if (!existing || existing.profileId !== req.params.id) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  const { label, planData } = req.body as Partial<StoredPlan>;
  const updated = store.upsertPlan({
    ...existing,
    label: label ?? existing.label,
    planData: planData ?? existing.planData,
    updatedAt: new Date().toISOString(),
  });
  res.json(updated);
});

// ─── DELETE /api/profiles/:id/plans/:pid ─────────────────────────────────────
router.delete('/:id/plans/:pid', (req: Request, res: Response) => {
  const existing = store.getPlan(req.params.pid);
  if (!existing || existing.profileId !== req.params.id) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  store.deletePlan(req.params.pid);
  res.json({ ok: true });
});

export default router;
