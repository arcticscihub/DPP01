import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { Types } from 'mongoose';
import z from 'zod';

import { registry, cookieAuth } from '../registry';

import { ContractSchema, ContractSchemaWithID } from '../../../validators/';

extendZodWithOpenApi(z);

//Post
registry.registerPath({
  method: 'post',
  path: '/api/contract/',
  tags: ['contract'],
  security: [{ [cookieAuth.name]: [] }],
  description: 'Post a contract.',
  summary: 'Post a contract.',
  request: {
    body: {
      description: 'Contract to be saved',
      content: {
        'application/json': {
          schema: ContractSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Contract saved',
      content: {
        'application/json': {
          schema: ContractSchemaWithID
        }
      }
    }
  }
});

//get?id={id}
registry.registerPath({
  method: 'get',
  path: '/api/contract?id={id}',
  tags: ['contract'],
  security: [{ [cookieAuth.name]: [] }],
  description: 'Get contract with given ID.',
  summary: 'Get contract with given ID.',
  request: {
    query: z.object({
      id: z.optional(z.instanceof(Types.ObjectId)) //6489a1024d2f9a4832beda13
    })
  },
  responses: {
    200: {
      description: 'Object with contract.',
      content: {
        'application/json': {
          schema: ContractSchemaWithID
        }
      }
    },
    422: {
      description: 'Getting contract failed - invalid ID',
      content: {
        'application/json': {
          schema: z.object({
            code: z.number().openapi({ example: 422 }),
            message: z.string().openapi({ example: 'Getting contract failed - invalid ID' })
          })
        }
      }
    }
  }
});

//get
registry.registerPath({
  method: 'get',
  path: '/api/contract/',
  tags: ['contract'],
  security: [{ [cookieAuth.name]: [] }],
  description: 'Get all contracts.',
  summary: 'Get all contracts.',
  responses: {
    200: {
      description: 'List of contracts.',
      content: {
        'application/json': {
          schema: z.array(ContractSchemaWithID)
        }
      }
    },
    422: {
      description: 'No content - successful operation'
    }
  }
});

export default registry;
