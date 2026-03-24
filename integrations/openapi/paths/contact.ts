import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { Types } from 'mongoose';
import z from 'zod';

import { registry } from '../registry';

import { ContactSchema, ContactSchemaWithID } from '../../../validators/';

extendZodWithOpenApi(z);

registry.registerPath({
  method: 'post',
  path: '/api/contact/',
  tags: ['contact'],
  description: 'Add a contact.',
  summary: 'Add a contact.',
  request: {
    body: {
      description: 'Contact to be saved',
      content: {
        'application/json': {
          schema: ContactSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Contract saved',
      content: {
        'application/json': {
          schema: ContactSchemaWithID
        }
      }
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/contact?id={id}',
  tags: ['contact'],
  description: 'Get contact with given ID.',
  summary: 'Get contact with given ID.',
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
          schema: ContactSchemaWithID
        }
      }
    },
    404: {
      description: 'Contract not found.'
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/contact/',
  tags: ['contact'],
  description: 'Get all contracts.',
  summary: 'Get all contracts.',
  responses: {
    200: {
      description: 'List of contracts.',
      content: {
        'application/json': {
          schema: z.array(ContactSchemaWithID)
        }
      }
    },
    204: {
      description: 'No content - successful operation'
    }
  }
});

export default registry;
