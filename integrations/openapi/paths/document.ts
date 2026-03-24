import z from 'zod';
import { registry, cookieAuth } from '../registry';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

//get
registry.registerPath({
  method: 'get',
  path: '/api/contract/files/{documentPath}',
  tags: ['document'],
  security: [{ [cookieAuth.name]: [] }],
  description: 'Get specific document.',
  request: {
    params: z.object({
      documentPath: z.string().openapi({ example: '/staging/dsfk_document.pdf' })
    })
  },
  summary: 'Get specific document.',
  responses: {
    200: {
      description: 'OK'
    },
    422: {
      description: 'No content'
    }
  }
});

registry.registerPath({
  method: 'delete',
  path: '/api/contract/files/{contractID}/{documentID}',
  tags: ['document'],
  security: [{ [cookieAuth.name]: [] }],
  description: 'Delete specific document from specific contract.',
  request: {
    params: z.object({
      contractID: z.string().openapi({ example: '64ff1cd3aa404c64e6cfcbdc' }),
      documentID: z.string().openapi({ example: '64ff1cd3aa666c64e6cfcbdc' })
    })
  },
  summary: 'Delete specific document from specific contract.',
  responses: {
    200: {
      description: 'OK'
    }
  }
});

export default registry;
