import { Request, Response } from 'express';

import db from '../db';
import { sendResetPasswordEmail as triggerResetEmail } from '../../services/aws/ses/email';
import { Logger } from '../../util/logging';

const authLogger = new Logger('AuthFlow');

const buildResponse = (res: Response, status: number, message: string) => {
  return res.status(status).json({ message, code: status });
};

export const handlePasswordResetRequest = async (req: Request, res: Response) => {
  authLogger.initReq = req;

  const rawEmail = req.body?.email;

  if (!rawEmail || typeof rawEmail !== 'string') {
    authLogger.debugMessage('Invalid email input for password reset', req);
    return buildResponse(res, 400, 'Invalid request payload');
  }

  const email = rawEmail.trim().toLowerCase();

  try {
    const account = await db.user.getUser({ email });

    if (!account) {
      authLogger.debugMessage('Password reset requested for unknown account', req);
      return buildResponse(res, 422, 'Unable to process request');
    }

    const result = await triggerResetEmail(account);

    if (result !== true) {
      authLogger.debugMessage('Email dispatch failed during password reset', req);
      return buildResponse(res, 502, 'Failed to send reset email');
    }

    authLogger.debugMessage('Password reset email dispatched', req);
    return buildResponse(res, 200, 'Password reset email sent');

  } catch (err) {
    authLogger.debugMessage('Error in password reset handler', req);
    return buildResponse(res, 500, 'Unexpected error');
  }
};

export default {
  handlePasswordResetRequest
};
