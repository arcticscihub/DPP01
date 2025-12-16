import { Router } from 'express';
import controller from '../../controllers/role';
import { verifyAuthStatus } from '../../util/request';

const router = Router();

router.get('/', verifyAuthStatus, controller.getRoles);

export default router;
