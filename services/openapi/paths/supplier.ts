import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { Types } from 'mongoose';
import z from 'zod';

import { registry, cookieAuth } from '../registry';

import { SupplierSchema, SupplierSchemaWithID } from '../../../validators/supplier';

extendZodWithOpenApi(z);

registry.registerPath({
  method: 'post',
  path: '/api/supplier/',
  tags: ['supplier'],
  security: [{ [cookieAuth.name]: [] }],
  description: 'Add a supplier.',
  summary: 'Add a supplier.',
  request: {
    body: {
      description: 'Supplier to be saved',
      content: {
        'application/json': {
          schema: SupplierSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Supplier saved',
      content: {
        'application/json': {
          schema: SupplierSchemaWithID
        }
      }
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/supplier?id={id}',
  tags: ['supplier'],
  security: [{ [cookieAuth.name]: [] }],
  description: 'Get supplier with given ID.',
  summary: 'Get supplier with given ID.',
  request: {
    query: z.object({
      id: z.optional(z.instanceof(Types.ObjectId)) //6489a1024d2f9a4832beda13
    })
  },
  responses: {
    200: {
      description: 'Object with Supplier.',
      content: {
        'application/json': {
          schema: SupplierSchemaWithID
        }
      }
    },
    404: {
      description: 'Supplier not found.'
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/supplier/',
  tags: ['supplier'],
  security: [{ [cookieAuth.name]: [] }],
  description: 'Get all Suppliers.',
  summary: 'Get all Suppliers.',
  responses: {
    200: {
      description: 'List of Suppliers.',
      content: {
        'application/json': {
          schema: z.array(SupplierSchemaWithID)
        }
      }
    },
    204: {
      description: 'No content - successful operation'
    }
  }
});

registry.registerPath({
  method: 'delete',
  path: '/api/supplier?id={id}',
  tags: ['supplier'],
  description: 'Delete supplier with given ID.',
  summary: 'Delete supplier with given ID.',
  request: {
    query: z.object({
      id: z.optional(z.instanceof(Types.ObjectId)) //6489a1024d2f9a4832beda13
    })
  },
  responses: {
    205: {
      description: 'Object with Supplier.',
      content: {
        'application/json': {
          schema: SupplierSchemaWithID
        }
      }
    },
    404: {
      description: 'Supplier not found.'
    }
  }
});

export default registry;
