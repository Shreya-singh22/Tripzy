import { Router } from 'express';
import { getAll, getBySlug, create, update, remove } from '../controllers/destinations.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getAll);
router.get('/:slug', getBySlug);
router.post('/', authenticate, requireAdmin, create);
router.put('/:id', authenticate, requireAdmin, update);
router.delete('/:id', authenticate, requireAdmin, remove);

export default router;
