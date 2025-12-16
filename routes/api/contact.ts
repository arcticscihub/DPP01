import { Router } from 'express';
import controller from '../../controllers/contact';
import { verifyAuthStatus } from '../../util/request';

const router = Router();

router.delete('/', verifyAuthStatus, controller.deleteContact);
router.get('/', verifyAuthStatus, controller.getContact);
router.patch('/', verifyAuthStatus, controller.editContact);
router.post('/', verifyAuthStatus, controller.addContact);

export default router;
