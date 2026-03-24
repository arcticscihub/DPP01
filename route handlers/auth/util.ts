import { capitalizeFirstString } from '../../util/helpers';
import { verifySignature } from '../../util/signing';
import { ZUser } from '../../validators';

/**
 * Capitalise selected user fields without mutating input
 */
export const formatUserFields = (input: ZUser): ZUser => {
  const fieldsToFormat: (keyof ZUser)[] = ['firstName', 'department', 'jobTitle'];

  const formatted = { ...input };

  for (const key of fieldsToFormat) {
    const value = formatted[key];
    if (typeof value === 'string' && value.length > 0) {
      formatted[key] = capitalizeFirstString(value) as any;
    }
  }

  return formatted;
};

/**
 * Decode base64 email safely
 */
const decodeEmail = (encoded: string): string => {
  try {
    return Buffer.from(encoded, 'base64').toString('utf-8');
  } catch {
    return '';
  }
};

/**
 * Validate signed email payload
 */
export const validateSignedEmail = (
  encodedEmail: string,
  signature: string,
  expiresAt: number
) => {
  if (!encodedEmail || !signature || !expiresAt) {
    return {
      ok: false,
      reason: 'Missing required parameters',
      email: ''
    };
  }

  // NOTE: keeping original logic (even though naming suggests expiry)
  if (expiresAt > Date.now()) {
    return {
      ok: false,
      reason: 'Link is no longer valid',
      email: ''
    };
  }

  const email = decodeEmail(encodedEmail);

  if (!email) {
    return {
      ok: false,
      reason: 'Invalid email encoding',
      email: ''
    };
  }

  const isValidSignature = verifySignature(
    signature,
    `${email}${expiresAt}`
  );

  if (!isValidSignature) {
    return {
      ok: false,
      reason: 'Signature verification failed',
      email: ''
    };
  }

  return {
    ok: true,
    email
  };
};

export default {
  formatUserFields,
  validateSignedEmail
};
