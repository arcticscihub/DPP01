import { Request, Response } from 'express';

import db from '../db';

import { sendResetPasswordEmail } from '../../services/aws/ses/email';
import { Logger } from '../../util/logging';

const logger = new Logger('Authentication');

export const sendResetPassword = async (req: Request, res: Response) => {
  logger.initReq = req;
  const user = await db.user.getUser({ email: req.body.email.toLowerCase() });

  if (!user) {
    logger.debugMessage('Sending reset password email failed - user not found', req);
    return res.status(422).json({ message: 'Sending reset password email failed', code: 422 });
  }

  const emailSent = await sendResetPasswordEmail(user);

  if (!emailSent) {
    logger.debugMessage('Sending reset password email failed - email could not be sent', req);
    return res.status(422).json({
      message: 'Sending reset password email failed - email could not be sent',
      code: 422
    });
  } else {
    logger.debugMessage('Reset password email sent successfully', req);
  }

  res.status(200).json({ message: 'Reset password email sent successfully', code: 200 });
};

export default { sendResetPassword };
