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

/* =========================
   Helpers
========================= */

const isValidId = (id?: string) =>
  typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);

const toObjectId = (id?: string) =>
  typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : undefined;

const respond = (
  res: Response,
  status: number,
  message?: string,
  data?: any,
  extra: Record<string, any> = {}
) => res.status(status).json({ ...(message && { message }), ...(data !== undefined && { data }), ...extra });

const error422 = (res: Response, message: string, issues?: any) =>
  respond(res, 422, message, undefined, { code: 422, ...(issues && { issues }) });

/* =========================
   DELETE USER
========================= */

export const deleteUser = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;

  const user = await db.user.getUser({ _id: req.params.id });

  if (!user) return error422(res, 'Could not delete user');

  const verified = util.auth.checkInitials({
    accessLevel: {
      actingUserRole: authenticated.role,
      threshold: Math.max(AccessRoles.VIEWER, user.role)
    },
    id: req.params.id
  });

  if (!verified.success) return error422(res, 'Could not delete user');

  if (user.role !== req.body.role || user.status !== req.body.status) {
    const isLast = await lastOfRole(user as WithID<User>);

    if (isLast) {
      return error422(
        res,
        `Unable to remove the last ${
          user.role === 2 ? 'company owner' : 'administrator'
        }. Please assign another user before deleting.`,
      );
    }
  }

  const result = await db.user.editUser({
    ...user.toObject(),
    status: States.DELETED
  });

  if (!result) return error422(res, 'Could not delete user');

  return respond(res, 200, 'User deleted successfully', undefined, { code: 200 });
};

/* =========================
   EDIT AUTH USER
========================= */

export const editAuthenticatedUser = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;

  const verified = util.auth.checkInitials({ id: authenticated._id });
  if (!verified.success) return error422(res, 'Could not update user');

  const user = await db.user.getUserById(authenticated._id);
  if (!user) return error422(res, 'User not found');

  const validation = ZUser.safeParse({
    ...req.body,
    phoneNumber: req.body.phoneNumber ? Number(req.body.phoneNumber) : undefined
  });

  if (!validation.success) {
    return error422(res, 'Validation failed', validation.error.issues);
  }

  const updatedUser = {
    _id: authenticated._id,
    ...validation.data,
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

  if (!result) return error422(res, 'Could not save user');

  return respond(res, 205, 'User updated successfully', undefined, { code: 205 });
};

/* =========================
   EDIT USER (ADMIN)
========================= */

export const editUser = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;

  const validation = ZUser.safeParse(req.body);
  if (!validation.success) {
    return error422(res, 'Validation failed', validation.error.issues);
  }

  const user = await db.user.getUser({ _id: req.params.id });
  if (!user) return error422(res, 'User not found');

  const verified = util.auth.checkInitials({
    accessLevel: {
      actingUserRole: authenticated.role,
      threshold: Math.max(AccessRoles.VIEWER, user.role, req.body.role)
    },
    company: { actingUser: authenticated, targetUserCompany: user.company as ObjectId },
    id: req.params.id
  });

  if (!verified.success) return error422(res, 'Could not update user');

  const isLast = (user.role !== req.body.role || user.status !== req.body.status) &&
    await lastOfRole(user as WithID<User>);

  if (isLast) {
    return error422(res, `Cannot modify last ${user.role === 2 ? 'owner' : 'admin'}`);
  }

  const updatedUser = {
    _id: user._id,
    ...validation.data,
    role: req.body.role,
    status: req.body.status ?? user.status,
    company: req.body.company?._id,
    firstName: user.firstName,
    onboarding: user.onboarding,
    isVerified: user.isVerified,
    password: user.password,
    favourites: user.favourites,
    notes: user.notes
  };

  const unsets = createUpdateObject(user.toObject(), updatedUser);

  const result = await db.user.editUser(updatedUser, unsets);

  if (!result) return error422(res, 'Could not save to database');

  if (!(authenticated._id as ObjectId).equals(user._id)) {
    await sendNotificationEmail(user);
  }

  return respond(res, 205, 'User updated successfully', undefined, { code: 205 });
};

/* =========================
   GET USER
========================= */

export const getAuthenticatedUser = async (req: Request, res: Response) => {
  const user = req.user as WithID<User>;
  logger.initReq = req;

  const result = await db.user.getUserById(user._id, {
    firstName: 1,
    lastName: 1,
    email: 1,
    phoneNumber: 1,
    jobTitle: 1,
    role: 1,
    department: 1,
    company: 1
  });

  if (!result) return res.status(404).send();

  return respond(res, 200, undefined, result);
};

/* =========================
   GET MANAGERS
========================= */

export const getManagers = async (req: Request, res: Response) => {
  const user = req.user as WithID<User>;
  logger.initReq = req;

  const verified = util.auth.checkInitials({
    accessLevel: { actingUserRole: user.role, threshold: AccessRoles.VIEWER }
  });

  if (!verified.success) return error422(res, 'Access denied');

  const managers = await db.user.getMany(
    {
      role: { $in: [AccessRoles.EDITOR, AccessRoles.OWNER] },
      status: 'active',
      company: user.company,
      isVerified: true
    },
    { firstName: 1, lastName: 1, email: 1, role: 1, jobTitle: 1 }
  );

  if (!managers) return error422(res, 'Failed to fetch managers');

  return respond(res, 200, undefined, managers);
};

/* =========================
   GET USERS
========================= */

export const getUsers = async (req: Request, res: Response) => {
  const user = req.user as WithID<User>;
  logger.initReq = req;

  const query: any = {};

  if (user.role !== AccessRoles.ADMIN || req.body.companySpecific) {
    query.company = user.company;
  }

  const result = await db.user.getMany(query, {
    password: 0,
    onboarding: 0,
    favourites: 0,
    notes: 0
  });

  if (!result) return error422(res, 'Failed to fetch users');

  return respond(res, 200, undefined, result);
};

/* =========================
   INVITE USER
========================= */

export const inviteUser = async (req: Request, res: Response) => {
  const user = req.user as WithID<User>;
  logger.initReq = req;

  if (await db.user.getUser({ email: req.body.email })) {
    return error422(res, 'Email already in use');
  }

  const validation = ZUser.safeParse(req.body);
  if (!validation.success) return error422(res, 'Validation failed', validation.error.issues);

  const company =
    user.role === AccessRoles.ADMIN &&
    mongoose.Types.ObjectId.isValid(req.body.company)
      ? new mongoose.Types.ObjectId(req.body.company)
      : user.company;

  const result = await db.user.addUser({
    ...validation.data,
    isVerified: false,
    onboarding: { state: OnboardingState.FORM },
    company
  });

  if (!result) return error422(res, 'User creation failed');

  await sendInvitationEmail(result);

  return respond(res, 201, 'Invitation sent');
};

/* =========================
   RESEND INVITE
========================= */

export const resendInvitation = async (req: Request, res: Response) => {
  logger.initReq = req;

  if (!isValidId(req.params.id)) return error422(res, 'Invalid ID');

  const user = await db.user.getUser({
    _id: toObjectId(req.params.id),
    isVerified: false
  });

  if (!user) return error422(res, 'User not found or already verified');

  await sendInvitationEmail(user);

  return respond(res, 201, 'Invitation sent');
};

/* =========================
   RESTORE USER
========================= */

export const restoreUser = async (req: Request, res: Response) => {
  const user = req.user as WithID<User>;
  logger.initReq = req;

  if (user.role === AccessRoles.VIEWER) {
    return error422(res, 'Insufficient permissions');
  }

  if (!isValidId(req.params.id)) return error422(res, 'Invalid ID');

  const target = await db.user.getUserById(toObjectId(req.params.id));
  if (!target) return error422(res, 'User not found');

  const result = await db.user.editUser({
    ...target.toObject(),
    status: States.ACTIVE
  });

  if (!result) return error422(res, 'Restore failed');

  return res.status(200).send();
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
