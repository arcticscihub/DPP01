import { Router } from 'express';
import controller from '../../controllers/consumption';
import { verifyAuthStatus } from '../../util/request';

const router = Router();

router.post('/', verifyAuthStatus, controller.addConsumption);
router.post('/aggregated', verifyAuthStatus, controller.getAggregatedData);
router.post('/detailed', verifyAuthStatus, controller.getConsumptionsDetailed);
router.get('/:id', verifyAuthStatus, controller.getConsumption);
router.patch('/:id', verifyAuthStatus, controller.editConsumption);
router.get('/types/:category', verifyAuthStatus, controller.getTypes);
router.get('/units/:category', verifyAuthStatus, controller.getUnits);

export default router;
