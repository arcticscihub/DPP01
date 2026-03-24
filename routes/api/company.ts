import { Router } from 'express';
import controller from '../../controllers/company';
import { verifyAuthStatus } from '../../util/request';

const router = Router();

router.get('/', verifyAuthStatus, controller.getCompany);
router.post('/', verifyAuthStatus, controller.addCompany);
router.get('/departments', verifyAuthStatus, controller.getDepartments);
router.get('/me', verifyAuthStatus, controller.getMyCompany);
router.patch('/me', verifyAuthStatus, controller.editMyCompany);
router.put('/me', verifyAuthStatus, controller.addMyCompany);
router.post('/me', verifyAuthStatus, controller.addMyCompany);
router.get('/:id', verifyAuthStatus, controller.getCompany);
router.patch('/:id', verifyAuthStatus, controller.editCompany);

export default router;
