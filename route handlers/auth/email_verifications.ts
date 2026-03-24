import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';

import { verify as verifyToken } from './util';
import db from '../db';

import { User } from '../../models';
import { Logger } from '../../util/logging';
import { States, WithID } from '../../util/types';

const log = new Logger('AuthHandlers');

/**
 * Extract + verify token payload
 */
const validateRequest = (req: Request) => {
  const emailEncoded = String(req.body.email || '');
  const signature = String(req.body.sign || '');
  const expiresAt = Number(req.body.validTo);

  return verifyToken(emailEncoded, signature, expiresAt);
};

/**
 * Account deletion / deactivation
 */
export const handleAccountStatus = async (req: Request, res: Response) => {
  log.initReq = req;

  const currentUser = req.user as WithID<User>;
  const shouldHardDelete = req.body.hard === 'true';

  const result = validateRequest(req);

  if (!result.success) {
    log.debugMessage(`Verification failed: ${result.message}`, req);
    return res.status(422).json({
      message: `Verification failed: ${result.message}`,
      code: 422
    });
  }

  const newStatus = shouldHardDelete ? States.DELETED : States.DEACTIVATED;

  const update = await db.user.updateOne(
    { _id: currentUser._id },
    { status: newStatus }
  );

  if (!update) {
    return res.status(422).json({
      message: 'Unable to update account status'
    });
  }

  log.debugMessage(`Account set to ${newStatus}`, req);

  return res.status(200).json({
    message: shouldHardDelete
      ? 'Account permanently deleted'
      : 'Account deactivated'
  });
};

/**
 * Password reset
 */
export const updatePassword = async (req: Request, res: Response) => {
  log.initReq = req;

  const result = validateRequest(req);

  if (!result.success) {
    log.debugMessage(`Verification failed: ${result.message}`, req);
    return res.status(422).json({
      message: `Verification failed: ${result.message}`,
      code: 422
    });
  }

  const hashed = await bcrypt.hash(req.body.password, 10);

  const update = await db.user.updateOne(
    { email: result.email.toLowerCase() },
    { password: hashed }
  );

  if (!update) {
    log.debugMessage('Password reset failed - user not found', req);
    return res.status(404).json({
      message: 'User not found',
      code: 404
    });
  }

  return res.status(200).send();
};

/**
 * Email verification (normal + invited users)
 */
export const confirmEmail = async (req: Request, res: Response) => {
  log.initReq = req;

  const result = validateRequest(req);

  if (!result.success) {
    log.debugMessage(`Verification failed: ${result.message}`, req);
    return res.status(422).json({
      message: `Verification failed: ${result.message}`,
      code: 422
    });
  }

  const email = result.email.toLowerCase();
  const isInviteFlow = Boolean(req.body.invited);

  let updatePayload: any = { isVerified: true };

  if (isInviteFlow) {
    const passwordHash = await bcrypt.hash(req.body.password, 10);

    updatePayload = {
      ...updatePayload,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      password: passwordHash
    };
  }

  const update = await db.user.updateOne({ email }, updatePayload);

  if (!update) {
    log.debugMessage('Email confirmation failed - user not found', req);
    return res.status(404).json({
      message: isInviteFlow
        ? 'Failed to complete invitation'
        : 'User not found',
      code: 404
    });
  }

  return res.status(200).send();
};

export default {
  handleAccountStatus,
  updatePassword,
  confirmEmail
};
