import { Request, Response } from 'express';
import mongoose from 'mongoose';

import db from './db';
import { createUpdateObject } from './util';
import { User } from '../models/';
import { OnboardingState, WithID } from '../util/types';
import { Logger } from '../util/logging';
import { ZLocation } from '../validators/';

const logger = new Logger('Locations');

/* =========================
   Helpers
========================= */

const toObjectId = (id?: string) =>
  typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : undefined;

const handleValidationError = (res: Response, error: any, message: string) =>
  res.status(422).json({
    message,
    code: 422,
    issues: error?.issues
  });

const isValidId = (id?: string) =>
  typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);

/* =========================
   Controllers
========================= */

export const addLocation = async (req: Request, res: Response) => {
  logger.initReq = req;

  const user = req.user as WithID<User>;

  const parsed = ZLocation.safeParse(req.body);

  if (!parsed.success) {
    logger.debugMessage('Could not add location - validation failed');
    return handleValidationError(
      res,
      parsed.error,
      'Could not add location information - validation failed'
    );
  }

  if (!user.company) {
    return res.status(422).json({
      message: 'Company not set yet',
      code: 422
    });
  }

  logger.debugMessage(
    `Adding location ${parsed.data.name ? `(${parsed.data.name})` : ''}`
  );

  const result = await db.location.addLocation({
    ...parsed.data,
    companyId: user.company
  });

  if (!result) {
    logger.debugMessage('Could not save location');
    return res.status(422).json({
      message: 'Could not save location information',
      code: 422
    });
  }

  // onboarding transition
  if (user.onboarding?.state === OnboardingState.LOCATION) {
    await User.findOneAndUpdate(
      { _id: user._id },
      { 'onboarding.state': OnboardingState.FORM },
      { new: true }
    );
  }

  logger.debugMessage('Location added');

  return res.status(205).json({
    message: 'Location updated successfully',
    code: 205
  });
};

export const deleteLocation = async (req: Request, res: Response) => {
  logger.initReq = req;

  const id = req.params.id;

  if (!id) {
    return res.status(422).json({
      message: 'No ID specified',
      code: 422
    });
  }

  if (!isValidId(id)) {
    return res.status(422).json({
      message: 'Invalid ID',
      code: 422
    });
  }

  const result = await db.location.deleteLocation(toObjectId(id));

  if (!result) {
    logger.debugMessage('Delete failed');
    return res.status(422).json({
      message: 'Could not delete location',
      code: 422
    });
  }

  logger.debugMessage('Location removed');

  return res.status(200).json({
    message: 'Location deleted successfully',
    code: 200
  });
};

export const editLocation = async (req: Request, res: Response) => {
  logger.initReq = req;

  const id = req.params.id;

  if (!id || !isValidId(id)) {
    return res.status(422).json({
      message: 'Invalid or missing ID',
      code: 422
    });
  }

  const parsed = ZLocation.safeParse(req.body);

  if (!parsed.success) {
    return handleValidationError(
      res,
      parsed.error,
      'Could not update location - validation failed'
    );
  }

  const existing = await db.location.getLocation(toObjectId(id));

  if (!existing) {
    return res.status(422).json({
      message: 'Location not found',
      code: 422
    });
  }

  const updated = {
    _id: existing._id,
    companyId: existing.companyId,
    ...parsed.data
  };

  const unsets = createUpdateObject(existing.toObject(), updated);

  const result = await db.location.editLocation(updated, unsets);

  if (!result) {
    logger.debugMessage('Update failed');
    return res.status(422).json({
      message: 'Could not update location',
      code: 422
    });
  }

  logger.debugMessage('Location updated');

  return res.status(205).json({
    message: 'Location updated successfully',
    code: 205,
    data: result
  });
};

export const getLocations = async (req: Request, res: Response) => {
  logger.initReq = req;

  const user = req.user as WithID<User>;

  if (!user.company) {
    return res.status(422).json({
      message: 'Company not set yet',
      code: 422
    });
  }

  const result = await db.location.getLocations(user.company);

  if (!result) {
    return res.status(422).json({
      message: 'Could not retrieve locations',
      code: 422
    });
  }

  logger.debugMessage('Locations retrieved');

  return res.status(200).json(result);
};

export default {
  addLocation,
  deleteLocation,
  editLocation,
  getLocations
};
