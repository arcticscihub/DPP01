import { Router } from 'express';
import controller from '../controllers/operation';
import { verifyAuthStatus } from '../util/request';

const router = Router();

router.get('/', verifyAuthStatus, controller.getOperations);
router.post('/', verifyAuthStatus, controller.addOperation);
router.delete('/:id', verifyAuthStatus, controller.deleteOperation);
router.patch('/:id', verifyAuthStatus, controller.editOperation);

export default router;
