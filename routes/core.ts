import { Router } from 'express';
import apiRoutes from './api/';
import assetRoutes from './asset';
import authRoutes from './auth/';
import locationRoutes from './location';
import onboardingRoutes from './onboarding';
import operationsRoutes from './operation';
import userRoutes from './user';

const router = Router();

router.use('/api', apiRoutes);
router.use('/asset', assetRoutes);
router.use('/auth', authRoutes);
router.use('/business-unit', operationsRoutes);
router.use('/location', locationRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/user', userRoutes);

export default router;
