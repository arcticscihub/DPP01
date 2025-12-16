import { ObjectId } from 'bson';
import { Request, Response } from 'express';
import mongoose from 'mongoose';

import db from './db';
import util, { createUpdateObject, lastOfRole } from './util';

import { User } from '../models/';
import { sendInvitationEmail, sendNotificationEmail } from '../services/aws/ses/email';
import { AccessRoles, OnboardingState, States } from '../util/types';
import { Logger } from '../util/logging';
import { WithID } from '../util/types';
import { ZUser } from '../validators/';

const logger = new Logger('Users');

export const deleteUser = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;

  const user = await db.user.getUser({ _id: req.params.id });

  if (!user) {
    logger.debugMessage('Could not delete user - User not found');
    return res.status(422).json({ message: 'Could not delete user', code: 422 });
  }

  const verified = util.auth.checkInitials({
    accessLevel: {
      actingUserRole: authenticated.role,
      threshold: Math.max(AccessRoles.VIEWER, user.role)
    },
    id: req.params.id
  });
  if (verified.success === false) {
    logger.debugMessage(`Could not delete user - ${verified.message}`);
    return res.status(422).json({ message: `Could not delete user`, code: 422 });
  }

  if (user.role !== req.body.role || user.status !== req.body.status) {
    const isLast = await lastOfRole(user as WithID<User>);
    if (isLast) {
      logger.debugMessage(
        `Could not delete user - Can not delete last ${
          user.role === 2 ? 'company owner' : 'administrator'
        }`,
        req
      );
      return res.status(422).json({
        message: `Unable to remove the last ${
          user.role === 2 ? 'company owner' : 'administrator'
        }. Please assign another user as the ${
          user.role === 2 ? 'owner' : 'administrator'
        } before deleting this user.`,
        code: 422
      });
    }
  }

  const result = await db.user.editUser({ ...user.toObject(), status: States.DELETED });

  if (!result) {
    logger.debugMessage('Could not delete user');
    return res.status(422).json({ message: 'Could not delete user', code: 422 });
  }

  logger.debugMessage('User deleted successfully');
  res.status(200).json({ message: 'User deleted successfully', code: 200 });
};

export const editAuthenticatedUser = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;

  const verified = util.auth.checkInitials({
    id: authenticated._id
  });
  logger.initReq = req;
  if (verified.success === false) {
    logger.debugMessage(`Could not delete user - ${verified.message}`);
    return res.status(422).json({ message: `Could not delete user`, code: 422 });
  }

  const user = await db.user.getUserById(authenticated._id);

  if (!user) {
    logger.debugMessage('Could not update user - excisting user not found');
    return res
      .status(422)
      .json({ message: 'Could not update user - excisting user not found', code: 422 });
  }

  const validation = ZUser.safeParse({
    ...req.body,
    phoneNumber:
      req.body.phoneNumber && typeof req.body.phoneNumber === 'string'
        ? Number(req.body.phoneNumber)
        : undefined,
    phoneCountryCode: req.body.phoneCountryCode ? req.body.phoneCountryCode : undefined,
    jobTitle: req.body.jobTitle && req.body.jobTitle.length > 0 ? req.body.jobTitle : undefined
  });

  if (validation.success === false) {
    logger.debugMessage('Could not update user - validation failed');
    return res.status(422).json({
      message: 'Could not update user - validation failed',
      code: 422,
      issues: validation.error.issues
    });
  }

  logger.debugMessage('Validation success - Storing user information');

  const updatedUser = {
    _id: authenticated._id,
    ...validation.data,
    firstName: validation.data.firstName ? validation.data.firstName : authenticated.firstName,
    role: authenticated.role,
    onboarding: authenticated.onboarding,
    isVerified: authenticated.isVerified,
    password: authenticated.password,
    favourites: authenticated.favourites,
    notes: authenticated.notes,
    company: authenticated.company
  };

  const unsets = createUpdateObject(user.toObject(), updatedUser);

  const result = await db.user.editUser(updatedUser, unsets);

  if (!result) {
    logger.debugMessage('Could not update user - Could not save to the database');
    return res
      .status(422)
      .json({ message: 'Could not update user - Could not save to the database', code: 422 });
  }

  logger.debugMessage('User updated successfully!');
  res.status(205).json({ message: 'Supplier updated successfully!', code: 205 });
};

export const editUser = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;

  const validation = ZUser.safeParse({
    ...req.body,
    phoneNumber:
      req.body.phoneNumber && typeof req.body.phoneNumber === 'string'
        ? Number(req.body.phoneNumber)
        : undefined,
    phoneCountryCode: req.body.phoneCountryCode ? req.body.phoneCountryCode : undefined,
    jobTitle: req.body.jobTitle && req.body.jobTitle.length > 0 ? req.body.jobTitle : undefined,
    department:
      req.body.department && req.body.department.length > 0 ? req.body.department : undefined
  });

  if (validation.success === false) {
    logger.debugMessage('Could not update user - validation failed');
    return res.status(422).json({
      message: 'Could not update user - validation failed',
      code: 422,
      issues: validation.error.issues
    });
  }

  const user = await db.user.getUser({ _id: req.params.id });

  if (!user) {
    logger.debugMessage('Could not update user - User not found', req);
    return res.status(422).json({ message: 'Could not update user', code: 422 });
  }

  const verified = util.auth.checkInitials({
    accessLevel: {
      actingUserRole: authenticated.role,
      threshold: Math.max(AccessRoles.VIEWER, user.role, req.body.role)
    },
    company: { actingUser: authenticated, targetUserCompany: user.company as ObjectId },
    id: req.params.id
  });

  if (verified.success === false) {
    logger.debugMessage(`Could not update user - ${verified.message}`);
    return res.status(422).json({ message: `Could not update user`, code: 422 });
  }

  if (user.role !== req.body.role || (req.body.status && user.status !== req.body.status)) {
    const isLast = await lastOfRole(user as WithID<User>);
    if (isLast) {
      logger.debugMessage(
        `Could not update user - Can not update last ${
          user.role === 2 ? 'company owner' : 'administrator'
        }`,
        req
      );
      return res.status(422).json({
        message: `Unable to remove the last ${
          user.role === 2 ? 'company owner' : 'administrator'
        }. Please assign another user as the owner before changing this user.`,
        code: 422
      });
    }
  }

  const updatedUser = {
    _id: user._id,
    ...validation.data,
    role: req.body.role,
    company: req.body.company._id,
    firstName: user.firstName,
    onboarding: user.onboarding,
    isVerified: user.isVerified,
    password: user.password,
    favourites: user.favourites,
    notes: user.notes,
    status: req.body.status ? req.body.status : user.status
  };

  const unsets = createUpdateObject(user.toObject(), updatedUser);

  const result = await db.user.editUser(updatedUser, unsets);

  if (!result) {
    logger.debugMessage('Could not update user - Could not save to the database');
    return res.status(422).json({ message: 'Could not save to the database', code: 422 });
  }

  if (!(authenticated._id as ObjectId).equals(user._id)) {
    const notificationEmailSendt = await sendNotificationEmail(user);
    if (!notificationEmailSendt) {
      logger.debugMessage('Notification email could not be sent');
    } else {
      logger.debugMessage('Notification email sent successfully');
    }
  }

  logger.debugMessage('User updated successfully!');
  res.status(205).json({ message: 'Supplier updated successfully!', code: 205 });
};

export const getAuthenticatedUser = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;
  logger.debugMessage('Authentication success - Looking up user object');
  const user = await db.user.getUserById(authenticated._id, {
    firstName: 1,
    lastName: 1,
    phoneNumber: 1,
    phoneCountryCode: 1,
    email: 1,
    jobTitle: 1,
    role: 1,
    department: 1,
    company: 1
  });
  if (user) {
    logger.debugMessage('Authentication success - User found');
    res.status(200).json(user);
  } else {
    logger.debugMessage('Could not authenticate user - User not found in database');
    res.status(404).send();
  }
};

export const getManagers = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;

  const verified = util.auth.checkInitials({
    accessLevel: { actingUserRole: authenticated.role, threshold: AccessRoles.VIEWER }
  });

  logger.initReq = req;
  if (verified.success === false) {
    logger.debugMessage(`Getting managers failed - ${verified.message}`);
    return res.status(422).json({ message: `Deleting user failed`, code: 422 });
  }

  logger.debugMessage('Looking up users with manager role');
  const managers = await db.user.getMany(
    {
      role: { $in: [AccessRoles.EDITOR, AccessRoles.OWNER] },
      status: 'active',
      company: authenticated.company,
      isVerified: true
    },
    {
      firstName: 1,
      lastName: 1,
      phoneNumber: 1,
      phoneCountryCode: 1,
      email: 1,
      role: 1,
      jobTitle: 1,
      company: 1
    }
  );
  if (managers) {
    logger.debugMessage(`Managers retrieved successfully - ${managers.length} managers found`);
    res.status(200).json({
      message: `Managers retrieved successfully - ${managers.length} managers found`,
      code: 200,
      data: managers
    });
  } else {
    logger.debugMessage('Getting managers failed');
    res.status(422).json({ message: 'Getting managers failed', code: 422 });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;
  logger.debugMessage(`Retreiving users for user with access role ${authenticated.role}`);

  const query: { company?: ObjectId } = {};

  (authenticated.role !== AccessRoles.ADMIN || req.body.companySpecific) &&
    (query.company = authenticated.company as ObjectId);

  const result = await db.user.getMany(query, {
    password: 0,
    onboarding: 0,
    favourites: 0,
    notes: 0
  });

  if (!result) {
    logger.debugMessage(`Retreiving users failed`);
    return res.status(422).json({ message: `Retreiving users failed`, code: 422 });
  }

  logger.debugMessage(`Retreived ${result.length} users successfully`);
  res.status(200).json({ message: 'Users retreived successfully', code: 200, data: result });
};

export const inviteUser = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;

  const userExists = await db.user.getUser({ email: req.body.email.toLowerCase() });
  logger.initReq = req;
  if (userExists) {
    logger.debugMessage('Inviting user failed - email address in use');
    return res
      .status(422)
      .json({ message: 'Inviting user failed - email address in use', code: 422 });
  }

  let company;

  if (
    authenticated.role === AccessRoles.ADMIN &&
    typeof req.body.company === 'string' &&
    mongoose.Types.ObjectId.isValid(req.body.company)
  ) {
    company = new mongoose.Types.ObjectId(req.body.company);
  } else {
    company = authenticated.company;
  }

  const validation = ZUser.safeParse(req.body);

  if (validation.success === false) {
    logger.debugMessage('Could not invite user - validation failed');
    return res.status(422).json({
      message: 'Could not invite user - validation failed',
      code: 422,
      issues: validation.error.issues
    });
  }

  const result = await db.user.addUser({
    ...(validation.data as User),
    isVerified: false,
    onboarding: {
      state: OnboardingState.FORM
    },
    company: company
  });

  if (!result) {
    logger.debugMessage('Inviting user failed - user could not be created');
    return res
      .status(422)
      .json({ message: 'Inviting user failed - user could not be created', code: 422 });
  }
  logger.debugMessage('User created successfully');

  const invitationEmailSent = await sendInvitationEmail(result);
  if (!invitationEmailSent) {
    logger.debugMessage('Inviting user failed - verification email could not be sent');
    return res
      .status(422)
      .json({ message: 'Inviting user failed - verification email could not be sent', code: 422 });
  } else {
    logger.debugMessage('Verification email sent successfully');
  }

  res.status(201).json({ message: 'Invitation succeeded', code: 201 });
};

export const resendInvitation = async (req: Request, res: Response) => {
  logger.initReq = req;
  if (!(typeof req.params.id === 'string' && mongoose.Types.ObjectId.isValid(req.params.id))) {
    logger.debugMessage('Resending invitation failed');
    return res.status(422).json({ message: 'Resending invitation failed', code: 422 });
  }

  const user = await db.user.getUser({
    _id: new mongoose.Types.ObjectId(req.params.id),
    isVerified: false
  });

  if (!user) {
    logger.debugMessage('Resending invitation failed - user not found or already verified');
    return res.status(422).json({ message: 'Resending invitation failed', code: 422 });
  }

  const invitationEmailSent = await sendInvitationEmail(user);

  if (!invitationEmailSent) {
    logger.debugMessage('Resending invitation failed - verification email could not be sent');
    return res.status(422).json({
      message: 'Resending invitation failed - verification email could not be sent',
      code: 422
    });
  } else {
    logger.debugMessage('Verification email sent successfully');
  }

  res.status(201).json({ message: 'Invitation succeeded', code: 201 });
};

export const restoreUser = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;
  if (authenticated.role === AccessRoles.VIEWER) {
    logger.debugMessage('Restoring user failed - User role not high enough');
    return res
      .status(422)
      .json({ message: 'Restoring user failed - User role not high enough', code: 422 });
  }

  if (!(typeof req.params.id === 'string' && mongoose.Types.ObjectId.isValid(req.params.id))) {
    logger.debugMessage('Restoring user failed');
    return res.status(200).json({ message: 'Restoring user failed', code: 200 });
  }

  const user = await db.user.getUserById(new mongoose.Types.ObjectId(req.params.id));

  if (!user) {
    logger.debugMessage('Restoring user failed - user not found');
    return res.status(200).json({ message: 'Restoring user failed', code: 200 });
  }

  const result = await db.user.editUser({ ...user.toObject(), status: States.ACTIVE });

  if (!result) {
    logger.debugMessage('Restoring user failed');
    return res.status(200).json({ message: 'Restoring user failed', code: 200 });
  }

  res.status(200).send();
};

export default {
  deleteUser,
  editAuthenticatedUser,
  editUser,
  getAuthenticatedUser,
  getManagers,
  getUsers,
  inviteUser,
  resendInvitation,
  restoreUser
};
