import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import z from 'zod';

import { EmailVerifiedSchema, MessageAuthSuccessSchema, UserSchema } from '../helperSchemas';
import { registry, cookieAuth } from '../registry';

import { UserLoginSchema, verifyEmailSchema } from '../../../validators/';
extendZodWithOpenApi(z);

registry.registerPath({
  method: 'post',
  path: '/auth/signin',
  tags: ['auth'],
  description: 'Login',
  summary: 'This will set a session cookie called connect.sid',
  request: {
    body: {
      content: {
        'application/json': {
          schema: UserLoginSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Json confirmation message',
      content: {
        'application/json': { schema: MessageAuthSuccessSchema }
      }
    },
    401: {
      description: 'Error: Unauthorized'
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/auth/signup',
  tags: ['auth'],
  description: 'Signup',
  summary: 'This will store your email in the db and send a verification email.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: UserSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Json confirmation message',
      content: {
        'application/json': { schema: MessageAuthSuccessSchema }
      }
    },
    401: {
      description: 'Error: Unauthorized'
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/auth/signout',
  tags: ['auth'],
  security: [{ [cookieAuth.name]: [] }],
  description: 'Signout',
  summary: 'This will terminate the user session.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: UserLoginSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Json confirmation message',
      content: {
        'application/json': { schema: MessageAuthSuccessSchema }
      }
    },
    401: {
      description: 'Error: Unauthorized'
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/auth/session/refresh',
  tags: ['auth'],
  security: [{ [cookieAuth.name]: [] }],
  description: 'Refresh user session',
  summary: 'Refresh user session.',
  responses: {
    200: {
      description: 'Json confirmation message',
      content: {
        'application/json': { schema: MessageAuthSuccessSchema }
      }
    },
    401: {
      description: 'Error: Unauthorized'
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/auth/user/email/verify',
  tags: ['auth'],
  security: [{ [cookieAuth.name]: [] }],
  description: 'Verify Email',
  summary: 'Is the email for the user verified?',
  responses: {
    200: {
      description: 'Json confirmation message',
      content: { 'application/json': { schema: EmailVerifiedSchema } }
    },
    401: {
      description: 'Error: Unauthorized'
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/auth/verifyemail?email={emailB64}&sig={signatureB64}`',
  tags: ['auth'],
  description: 'Login',
  summary: 'The backend will confirm the signature and set the users email as verified',
  request: {
    params: verifyEmailSchema
  },
  responses: {
    200: {
      description: 'Json confirmation message',
      content: {
        'application/json': {
          schema: z.object({ isVerified: z.boolean().openapi({ default: true }) })
        }
      }
    },
    400: {
      description: 'Verifying email failed - missing email or signature / Already verified'
    },
    404: {
      description: 'Verifying email failed - no user found'
    }
  }
});

export default registry;
