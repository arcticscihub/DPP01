import { Router } from 'express';
import controller from '../controllers/asset';
import { verifyAuthStatus } from '../util/request';

const router = Router();

router.get('/', verifyAuthStatus, controller.getAssets);
router.post('/', verifyAuthStatus, controller.addAsset);
router.delete('/:id', verifyAuthStatus, controller.deleteAsset);
router.patch('/:id', verifyAuthStatus, controller.editAsset);

export default router;
