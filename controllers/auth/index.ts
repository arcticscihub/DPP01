import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import { IVerifyOptions } from 'passport-local';

import emailNotifications from './email-notifications';
import emailVerifications from './email-verifications';
import { capitalizeLetters } from './util';

import db from '../db';

import { User } from '../../models/';
import { sendVerificationEmail, sendVerifyDeleteMail } from '../../services/aws/ses/email';
import { AccessRoles, OnboardingState } from '../../util/types';
import { Logger } from '../../util/logging';
import { WithID } from '../../util/types';

const logger = new Logger('Authentication');

export const changePassword = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;
  const user = await db.user.getUserById(authenticated._id);

  if (!user) {
    logger.debugMessage('Changing password failed');
    return res.status(404).json({ message: 'Changing password failed', code: 404 });
  }

  if (
    !(
      typeof user.password === 'string' &&
      (await bcrypt.compare(req.body.previousPassword, user.password))
    )
  ) {
    logger.debugMessage('Changing password failed');
    return res.status(422).json({ message: 'Changing password failed', code: 422 });
  }

  const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
  const result = await db.user.editUser({ ...user.toObject(), password: hashedPassword });

  if (!result) {
    logger.debugMessage('Changing password failed');
    return res.status(422).json({ message: 'Changing password failed', code: 422 });
  }

  logger.debugMessage('Changing password succeeded');
  res.status(200).json({ message: 'Changing password succeeded', code: 200 });
};

export const deleteAccount = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  const deleteAccount = req.query.hard === 'true';

  await sendVerifyDeleteMail(authenticated, deleteAccount);
  res.status(200).send();
};

export const getEmailVerification = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;
  const result = await db.user.getUserById(authenticated._id, { _id: 0, isVerified: 1 });

  if (!result) {
    logger.debugMessage('Could not find email verification status - no user found');
    return res
      .status(404)
      .json({ message: 'Could not find email verification status - no user found', code: 404 });
  }

  logger.debugMessage('Email verification status found');
  res.status(200).json(result);
};

export const getUserContext = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;

  const result = await db.user.getUserById(authenticated._id, { _id: 0, onboarding: 1, role: 1 });

  if (!result) {
    logger.debugMessage('Could not find onboarding status - no user found');
    return res
      .status(404)
      .json({ message: 'Could not find onboarding status - no user found', code: 404 });
  }

  logger.debugMessage('Onboarding status found');
  res.status(200).json(result);
};

export const refreshSession = (req: Request, res: Response) => {
  logger.initReq = req;
  logger.debugMessage('User logged in, refreshing session');
  res.status(200).json(req.user);
};

export const resendVerifyEmail = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;

  const emailSent = await sendVerificationEmail(authenticated);

  if (!emailSent) {
    logger.debugMessage('Resending email failed - verification email could not be sent');
    return res
      .status(422)
      .json({ message: 'Signup failed - verification email could not be sent', code: 422 });
  } else {
    logger.debugMessage('Verification email sent successfully');
  }
  res.status(200).send();
};

export const signIn = async (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('local', (error: any, user: User | false, info: IVerifyOptions) => {
    logger.initReq = req;
    if (error) {
      return next(error);
    }
    if (!user) {
      logger.debugMessage(`Authentication failed`);
      return res.status(401).json({ message: 'Authentication failed', type: info.message });
    }
    req.login(user, function (error) {
      if (error) {
        return next(error);
      }
      logger.debugMessage('Authentication succeeded - User logged in');
      res.status(200).json({ message: 'Authentication succeeded', code: 200 });
    });
  })(req, res, next);
};

export const signOut = (req: Request, res: Response) => {
  logger.initReq = req;
  req.logout(error => error && console.log(error));
  logger.debugMessage('Signing out succeeded');
  res.status(200).send();
};

export const signUp = async (req: Request, res: Response) => {
  logger.initReq = req;
  const userExists = await db.user.getUser({ email: req.body.email.toLowerCase() });

  if (userExists) {
    logger.debugMessage('Signup failed - email address in use');
    return res.status(422).json({ message: 'Signup failed - email address in use', code: 422 });
  }

  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const parsed = capitalizeLetters(req.body);
  const result = await db.user.addUser({
    ...parsed,
    role: AccessRoles.OWNER,
    password: hashedPassword,
    isVerified: false,
    onboarding: { state: OnboardingState.COMPANY }
  });

  if (!result) {
    logger.debugMessage('Signup failed - user could not be created');
    return res
      .status(422)
      .json({ message: 'Signup failed - user could not be created', code: 422 });
  }
  logger.debugMessage('New user created successfully');

  const emailSent = await sendVerificationEmail(result);

  if (!emailSent) {
    logger.debugMessage('Signup failed - verification email could not be sent');
    return res
      .status(422)
      .json({ message: 'Signup failed - verification email could not be sent', code: 422 });
  } else {
    logger.debugMessage('Verification email sent successfully');
  }

  res.status(201).json({ message: 'Signup succeeded', code: 201 });
};

export default {
  ...emailNotifications,
  ...emailVerifications,
  changePassword,
  deleteAccount,
  getEmailVerification,
  getUserContext,
  refreshSession,
  resendVerifyEmail,
  signIn,
  signOut,
  signUp
};
