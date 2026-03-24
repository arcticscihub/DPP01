import { Router } from 'express';
import controller from '../../controllers/supplier';
import { verifyAuthStatus } from '../../util/request';

const router = Router();

router.delete('/', verifyAuthStatus, controller.deleteSupplier);
router.get('/', verifyAuthStatus, controller.getSuppliers);
router.patch('/', verifyAuthStatus, controller.editSupplier);
router.post('/', verifyAuthStatus, controller.addSupplier);

router.get('/search', verifyAuthStatus, controller.getSearchResult);

export default router;
