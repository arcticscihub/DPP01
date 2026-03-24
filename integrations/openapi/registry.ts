import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
export const registry = new OpenAPIRegistry();

export const cookieAuth = registry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'connect.sid',
  description:
    'This does not do anything other than document that you need a cookie and prints a curl -H. You would need to set the cookie in your browser manually or by signing in.'
});
