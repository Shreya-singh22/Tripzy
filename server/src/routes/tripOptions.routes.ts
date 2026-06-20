import { Router } from 'express';
import { getAll } from '../controllers/tripOptions.controller';

const router = Router();

router.get('/', getAll);

export default router;
