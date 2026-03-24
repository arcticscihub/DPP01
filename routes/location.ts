import { Router } from 'express';
import controller from '../controllers/location';
import { verifyAuthStatus } from '../util/request';

const router = Router();

router.get('/', verifyAuthStatus, controller.getLocations);
router.post('/', verifyAuthStatus, controller.addLocation);
router.delete('/:id', verifyAuthStatus, controller.deleteLocation);
router.patch('/:id', verifyAuthStatus, controller.editLocation);

export default router;
