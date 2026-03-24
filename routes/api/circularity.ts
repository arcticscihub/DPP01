import { Router } from 'express';
import controller from '../../controllers/circularity';
import { verifyAuthStatus } from '../../util/request';

const router = Router();

router.get('/', verifyAuthStatus, controller.getCircularities);

export default router;
