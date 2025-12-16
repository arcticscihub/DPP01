import { Router } from 'express';
import passport from 'passport';

import userRoutes from './user';

import controller from '../../controllers/auth';
import { arcticsciencehubFormConvertion, arcticsciencehubLoginConvertion, verifyAuthStatus } from '../../util/request';

const router = Router();

router.post('/delete', verifyAuthStatus, controller.deleteAccount);
router.post('/delete/confirm', verifyAuthStatus, controller.confirmDeleteAccount);
router.post('/password/change', verifyAuthStatus, controller.changePassword);
router.post('/session/refresh', verifyAuthStatus, controller.refreshSession);
router.post('/signin', arcticsciencehubLoginConvertion, controller.signIn);
router.post('/signout', verifyAuthStatus, controller.signOut);
router.post('/signup', arcticsciencehubFormConvertion, controller.signUp);
router.use('/user', userRoutes);

export default router;
