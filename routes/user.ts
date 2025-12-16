import { Router } from 'express';
import controller from '../controllers/user';
import { verifyAuthStatus } from '../util/request';

const router = Router();

router.post('/', verifyAuthStatus, controller.getUsers);
router.post('/invite', verifyAuthStatus, controller.inviteUser);
router.patch('/invite/:id', verifyAuthStatus, controller.resendInvitation);
router.get('/me', verifyAuthStatus, controller.getAuthenticatedUser);
router.patch('/me', verifyAuthStatus, controller.editAuthenticatedUser);
router.get('/managers', verifyAuthStatus, controller.getManagers);
router.patch('/restore/:id', verifyAuthStatus, controller.restoreUser);
router.delete('/:id', verifyAuthStatus, controller.deleteUser);
router.patch('/:id', verifyAuthStatus, controller.editUser);

export default router;
