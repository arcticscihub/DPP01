import { Router } from 'express';
import controller from '../controllers/auth';
import { verifyAuthStatus } from '../util/request';

const router = Router();

router.get('/me', verifyAuthStatus, controller.getUserContext);

export default router;
