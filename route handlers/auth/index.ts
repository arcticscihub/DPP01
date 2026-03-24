import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import { IVerifyOptions } from 'passport-local';

import emailNotifications from './email_notifications';
import emailVerifications from './email_verifications';
import { capitalizeLetters } from './util';

import db from '../db';

import { User } from '../../models';
import {
  sendVerificationEmail,
  sendVerifyDeleteMail
} from '../../services/aws/ses/email';
import { AccessRoles, OnboardingState, WithID } from '../../util/types';
import { Logger } from '../../util/logging';

const log = new Logger('Auth');

/**
 * Helpers
 */
const fail = (res: Response, message: string, code = 422) =>
  res.status(code).json({ message, code });

const getCurrentUser = (req: Request) => req.user as WithID<User>;

/**
 * Change password
 */
export const updateUserPassword = async (req: Request, res: Response) => {
  log.initReq = req;

  const current = getCurrentUser(req);
  const user = await db.user.getUserById(current._id);

  if (!user) {
    log.debugMessage('Password update failed - user missing');
    return fail(res, 'Password update failed', 404);
  }

  const isValidPassword =
    typeof user.password === 'string' &&
    (await bcrypt.compare(req.body.previousPassword, user.password));

  if (!isValidPassword) {
    log.debugMessage('Password update failed - invalid credentials');
    return fail(res, 'Password update failed');
  }

  const newHash = await bcrypt.hash(req.body.newPassword, 10);

  const updated = await db.user.editUser({
    ...user.toObject(),
    password: newHash
  });

  if (!updated) {
    log.debugMessage('Password update failed - persistence issue');
    return fail(res, 'Password update failed');
  }

  log.debugMessage('Password updated successfully');
  return res.status(200).json({ message: 'Password updated', code: 200 });
};

/**
 * Trigger account deletion flow
 */
export const requestAccountDeletion = async (req: Request, res: Response) => {
  const current = getCurrentUser(req);
  const permanent = req.query.hard === 'true';

  await sendVerifyDeleteMail(current, permanent);
  return res.status(200).send();
};

/**
 * Email verification status
 */
export const fetchEmailStatus = async (req: Request, res: Response) => {
  log.initReq = req;

  const current = getCurrentUser(req);

  const data = await db.user.getUserById(current._id, {
    _id: 0,
    isVerified: 1
  });

  if (!data) {
    log.debugMessage('Email status lookup failed');
    return fail(res, 'User not found', 404);
  }

  log.debugMessage('Email status retrieved');
  return res.status(200).json(data);
};

/**
 * User onboarding + role context
 */
export const fetchUserContext = async (req: Request, res: Response) => {
  log.initReq = req;

  const current = getCurrentUser(req);

  const data = await db.user.getUserById(current._id, {
    _id: 0,
    onboarding: 1,
    role: 1
  });

  if (!data) {
    log.debugMessage('User context lookup failed');
    return fail(res, 'User not found', 404);
  }

  log.debugMessage('User context retrieved');
  return res.status(200).json(data);
};

/**
 * Session refresh
 */
export const getSession = (req: Request, res: Response) => {
  log.initReq = req;
  log.debugMessage('Session refresh');

  return res.status(200).json(req.user);
};

/**
 * Resend verification email
 */
export const resendVerification = async (req: Request, res: Response) => {
  log.initReq = req;

  const current = getCurrentUser(req);
  const sent = await sendVerificationEmail(current);

  if (!sent) {
    log.debugMessage('Verification resend failed');
    return fail(res, 'Could not send verification email');
  }

  log.debugMessage('Verification email resent');
  return res.status(200).send();
};

/**
 * Login
 */
export const login = (req: Request, res: Response, next: NextFunction) => {
  log.initReq = req;

  passport.authenticate(
    'local',
    (err: any, user: User | false, info: IVerifyOptions) => {
      if (err) return next(err);

      if (!user) {
        log.debugMessage('Login failed');
        return res
          .status(401)
          .json({ message: 'Authentication failed', type: info.message });
      }

      req.login(user, loginErr => {
        if (loginErr) return next(loginErr);

        log.debugMessage('Login successful');
        return res.status(200).json({
          message: 'Authentication succeeded',
          code: 200
        });
      });
    }
  )(req, res, next);
};

/**
 * Logout
 */
export const logout = (req: Request, res: Response) => {
  log.initReq = req;

  req.logout(err => {
    if (err) console.error(err);
  });

  log.debugMessage('Logout successful');
  return res.status(200).send();
};

/**
 * Signup
 */
export const register = async (req: Request, res: Response) => {
  log.initReq = req;

  const email = req.body.email.toLowerCase();

  const existing = await db.user.getUser({ email });

  if (existing) {
    log.debugMessage('Registration failed - email in use');
    return fail(res, 'Email already in use');
  }

  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const formatted = capitalizeLetters(req.body);

  const createdUser = await db.user.addUser({
    ...formatted,
    email,
    password: passwordHash,
    role: AccessRoles.OWNER,
    isVerified: false,
    onboarding: { state: OnboardingState.COMPANY }
  });

  if (!createdUser) {
    log.debugMessage('Registration failed - DB error');
    return fail(res, 'Could not create user');
  }

  log.debugMessage('User created');

  const emailSent = await sendVerificationEmail(createdUser);

  if (!emailSent) {
    log.debugMessage('Registration failed - email not sent');
    return fail(res, 'Could not send verification email');
  }

  log.debugMessage('Verification email sent');
  return res.status(201).json({ message: 'Signup successful', code: 201 });
};

export default {
  ...emailNotifications,
  ...emailVerifications,
  updateUserPassword,
  requestAccountDeletion,
  fetchEmailStatus,
  fetchUserContext,
  getSession,
  resendVerification,
  login,
  logout,
  register
};
