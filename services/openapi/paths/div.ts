import z from 'zod';
import { registry, cookieAuth } from '../registry';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { UserSchema } from '../helperSchemas';
extendZodWithOpenApi(z);

registry.registerPath({
  method: 'get',
  path: '/user/me',
  tags: ['div'],
  security: [{ [cookieAuth.name]: [] }],
  description: 'User information',
  summary: 'Get information on the logged in user.',
  responses: {
    200: {
      description: 'Json confirmation message',
      content: { 'application/json': { schema: UserSchema } }
    },
    401: {
      description: 'Error: Unauthorized'
    }
  }
});

export default registry;
