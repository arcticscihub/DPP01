import { Router } from 'express';
import controller from '../../controllers/contract';
import { verifyAuthStatus } from '../../util/request';

const router = Router();

router.delete('/', verifyAuthStatus, controller.deleteContract);
router.get('/', verifyAuthStatus, controller.getContract);
router.patch('/', verifyAuthStatus, controller.editContract);
router.post('/', verifyAuthStatus, controller.addContract);

router.get('/bonuses', verifyAuthStatus, controller.getBonuses);
router.get('/departments', verifyAuthStatus, controller.getDepartments);
router.get('/types', verifyAuthStatus, controller.getAgreementTypes);
router.post('/favourite', verifyAuthStatus, controller.addFavourite);
router.delete('/favourite', verifyAuthStatus, controller.deleteFavourite);
router.delete('/files/:contractID/:documentID', verifyAuthStatus, controller.deleteDocument);
router.get('/files/:documentPath', verifyAuthStatus, controller.getDocument);
router.post('/note', verifyAuthStatus, controller.addNote);
router.delete('/note', verifyAuthStatus, controller.deleteNote);
router.get('/scopes', verifyAuthStatus, controller.getScopes);
router.get('/search', verifyAuthStatus, controller.getSearchResult);

export default router;
