import fs from 'fs';
import yaml from 'yaml';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateOpenAPI } from '../../services/openapi/generator';

import circularityRoutes from './circularity';
import companyRoutes from './company';
import consumptionRoutes from './consumption';
import contractRoutes from './contract';
import contactPersonRoutes from './contact';
import roleRoutes from './role';
import supplierRoutes from './supplier';

const router = Router();
const docs = generateOpenAPI();
const fileContent = yaml.stringify(docs);

fs.writeFileSync(`${__dirname}/../../services/openapi/openapi-docs.yaml`, fileContent, {
  encoding: 'utf-8'
});

router.use('/circularity', circularityRoutes);
router.use('/company', companyRoutes);
router.use('/consumption', consumptionRoutes);
router.use('/contact', contactPersonRoutes);
router.use('/contract', contractRoutes);
router.use('/doc', swaggerUi.serve, swaggerUi.setup(docs));
router.use('/role', roleRoutes);
router.use('/supplier', supplierRoutes);

export default router;
