import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { AccessRoles } from '../../util/types';

extendZodWithOpenApi(z);

export const MessageAuthSuccessSchema = z.object({
  message: z.string().openapi({ default: 'Authentication succeeded' }),
  code: z.number().openapi({ default: 200 })
});

export const EmailVerifiedSchema = z.object({
  isVerified: z.boolean().openapi({ default: true })
});

export const CompanyInfoSchema = z.object({
  name: z.string().openapi({ example: 'Knowit Objectnet AS' })
});

export const SignupUserSchema = z
  .object({
    firstName: z.string().min(1).max(100).openapi({ example: 'Mario' }),
    lastName: z.string().min(1).max(100).openapi({ example: 'Brother' }),
    email: z.string().email().min(5).max(100),
    password: z.string().openapi({
      example: 'sUp3R*sEcreT!',
      description: 'The password will be hashed upon creation, and is never stored in clear text'
    }),
    jobTitle: z.optional(z.string().min(1).max(100)).openapi({ example: 'Plumber' })
  })
  .openapi('SignupUser');

export const UserSchema = z
  .object({
    //Want to utilize Interface here... 😥
    _id: z.string().openapi({ example: '1234567890qwertyuiopasdf' }),
    firstName: z.string().openapi({ example: 'Mario' }),
    lastName: z.string().openapi({ example: 'Brother' }),
    email: z.string().email().min(5).max(100),
    isVerified: z.boolean(),
    role: z.nativeEnum(AccessRoles),
    password: z.string().openapi({
      example: '$2y$10$MbUXUEByXO4h0ZxbLt2/6OW1I.Xt/hGT8Fa1IwT59yJfqDhdOhKl6',
      description: 'This is an example of a hashed password'
    }),
    jobTitle: z.string().min(1).max(100).openapi({ example: 'Plumber' }),
    favourites: z.object({
      contracts: z.array(z.string().length(24)).openapi({ description: 'List of contract IDs' })
    }),
    notes: z.object({
      contracts: z
        .array(
          z.object({
            contractId: z.string().length(24),
            text: z.string()
          })
        )
        .openapi({ description: 'List of contract IDs with text' })
    })
  })
  .openapi('User');
