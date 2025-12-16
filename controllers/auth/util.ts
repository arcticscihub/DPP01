import { capitalizeFirstString } from '../../util/helpers';
import { verifySignature } from '../../util/signing';
import { ZUser } from '../../validators/';

export const capitalizeLetters = (reqBody: ZUser) => {
  reqBody.firstName && (reqBody.firstName = capitalizeFirstString(reqBody.firstName));
  reqBody.department && (reqBody.department = capitalizeFirstString(reqBody.department));
  reqBody.jobTitle && (reqBody.jobTitle = capitalizeFirstString(reqBody.jobTitle));

  return reqBody;
};

export const verify = (emailB64: string, signB64: string, validTo: number) => {
  if (!emailB64 || !signB64 || !validTo) {
    return {
      success: false,
      message: 'At least 1 of the required parameters are missing',
      email: ''
    };
  }

  if (validTo > Date.now()) {
    return { success: false, message: 'Link is no longer valid', email: '' };
  }

  const email = Buffer.from(emailB64, 'base64').toString('binary');
  if (!verifySignature(signB64, email + validTo.toString())) {
    return { success: false, message: 'Invalid signature', email: '' };
  }

  return { success: true, email: email };
};

export default { capitalizeLetters, verify };
