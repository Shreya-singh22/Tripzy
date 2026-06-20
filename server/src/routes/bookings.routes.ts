import { Router } from 'express';
import { create, list, getByRef } from '../controllers/bookings.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.post('/', create);
router.get('/', list);
router.get('/:ref', getByRef);

export default router;
