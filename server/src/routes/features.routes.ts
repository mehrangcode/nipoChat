import { Router } from 'express';
import { getFeatures } from '../config/features';

export const featuresRoutes = Router();

// GET /api/features — public: client uses this to show/hide call UI
featuresRoutes.get('/', (_req, res) => {
  res.json({ features: getFeatures() });
});
