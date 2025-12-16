import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';

import { verify } from './util';

import db from '../db';

import { User } from '../../models';
import { Logger } from '../../util/logging';
import { States, WithID } from '../../util/types';

const logger = new Logger('Authentication');

export const confirmDeleteAccount = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;

  const emailB64: string = (req.body.email as string) || '';
  const signB64: string = (req.body.sign as string) || '';
  const validTo: number = Number(req.body.validTo);
  const hardDelete: boolean = req.body.hard === 'true';

  const verification = verify(emailB64, signB64, validTo);

  if (verification.success === false) {
    logger.debugMessage(`Failed to verify email - ${verification.message}`, req);
    return res
      .status(422)
      .json({ message: `Failed to verify email - ${verification.message}`, code: 422 });
  }

  if (hardDelete) {
    const result = await db.user.updateOne({ _id: authenticated._id }, { status: States.DELETED });
    if (result) {
      logger.debugMessage('Marking acount as deleted', req);
      return res.status(200).json({ message: 'Account deleted successfully' });
    }
  }

  const result = await db.user.updateOne(
    { _id: authenticated._id },
    { status: States.DEACTIVATED }
  );

  if (result) {
    logger.debugMessage('Marking acount as deactivated', req);
    return res.status(200).json({ message: 'Account deactivated successfully' });
  }

  res.status(422).json({ message: 'Could not complete account action' });
};

export const resetPassword = async (req: Request, res: Response) => {
  logger.initReq = req;

  const emailB64: string = (req.body.email as string) || '';
  const signB64: string = (req.body.sign as string) || '';
  const validTo: number = Number(req.body.validTo);

  const verification = verify(emailB64, signB64, validTo);

  if (verification.success === false) {
    logger.debugMessage(`Failed to verify email - ${verification.message}`, req);
    return res
      .status(422)
      .json({ message: `Failed to verify email - ${verification.message}`, code: 422 });
  }

  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const user = await db.user.updateOne(
    { email: verification.email.toLowerCase() },
    {
      password: hashedPassword
    }
  );
  if (!user) {
    logger.debugMessage('Failed to complete invitation - could not store user info', req);
    return res.status(404).json({ message: 'Failed to complete invitation', code: 404 });
  }

  res.status(200).send();
};

export const verifyEmail = async (req: Request, res: Response) => {
  logger.initReq = req;

  const emailB64: string = (req.body.email as string) || '';
  const signB64: string = (req.body.sign as string) || '';
  const validTo: number = Number(req.body.validTo);

  const verification = verify(emailB64, signB64, validTo);

  if (verification.success === false) {
    logger.debugMessage(`Failed to verify email - ${verification.message}`, req);
    return res
      .status(422)
      .json({ message: `Failed to verify email - ${verification.message}`, code: 422 });
  }

  if (!req.body.invited) {
    const user = await db.user.updateOne(
      { email: verification.email.toLowerCase() },
      { isVerified: true }
    );
    if (!user) {
      logger.debugMessage('Failed to verify email - no user found', req);
      return res
        .status(404)
        .json({ message: 'Failed to verify email - no user found', code: 404 });
    }
    return res.status(200).send();
  }

  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const user = await db.user.updateOne(
    { email: verification.email.toLowerCase() },
    {
      isVerified: true,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      password: hashedPassword
    }
  );
  if (!user) {
    logger.debugMessage('Failed to complete invitation - could not store user info', req);
    return res.status(404).json({ message: 'Failed to complete invitation', code: 404 });
  }

  res.status(200).send();
};

export default {
  confirmDeleteAccount,
  resetPassword,
  verifyEmail
};
