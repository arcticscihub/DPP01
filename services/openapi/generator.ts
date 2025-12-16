import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import registeredDefinitions from './paths/index';

export function generateOpenAPI() {
  const config = {
    openapi: '3.0.0',
    info: {
      version: '0.1.0',
      title: 'arcticsciencehub API',
      description: 'This is the API'
    }
  };

  return new OpenApiGeneratorV3(registeredDefinitions).generateDocument(config);
}
