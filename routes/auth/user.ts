import { Router } from 'express';

import controller from '../../controllers/auth';
import { arcticsciencehubFormConvertion, verifyAuthStatus } from '../../util/request';

const router = Router();

router.get('/email/verify', verifyAuthStatus, controller.getEmailVerification);
router.post('/email/verify', controller.verifyEmail);
router.post('/email/verify/token', controller.resendVerifyEmail);
router.post('/password/reset', arcticsciencehubFormConvertion, controller.resetPassword);
router.post('/password/reset/token', arcticsciencehubFormConvertion, controller.sendResetPassword);

export default router;
