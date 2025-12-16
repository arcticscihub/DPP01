import { Request, Response } from 'express';
import mongoose from 'mongoose';

import db from './db';
import { createUpdateObject } from './util';

import { User } from '../models/';
import { OnboardingState } from '../util/types';
import { Logger } from '../util/logging';
import { WithID } from '../util/types';
import { ZLocation } from '../validators/';

const logger = new Logger('Locations');

export const addLocation = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  const validation = ZLocation.safeParse(req.body);
  logger.initReq = req;
  if (validation.success === false) {
    logger.debugMessage(`Could not add location information - validation failed`);
    return res.status(422).json({
      message: `Could not add location information - validation failed`,
      code: 422,
      issues: validation.error.issues
    });
  }

  if (!authenticated.company) {
    return res
      .status(422)
      .json({ message: 'Could not return location detailes - Company not set yet', code: 422 });
  }

  logger.debugMessage(
    `Validation success - Adding location ${
      validation.data.name ? `with name ${validation.data.name}` : `information`
    }`
  );

  const result = await db.location.addLocation({
    ...validation.data,
    companyId: authenticated.company
  });

  if (!result) {
    logger.debugMessage(`Could not save location information to database`);
    return res.status(422).json({ message: 'Could not save location information', code: 422 });
  }

  logger.debugMessage(`Location added successfully`);
  authenticated.onboarding.state === OnboardingState.LOCATION &&
    (await User.findOneAndUpdate(
      { _id: authenticated._id },
      { 'onboarding.state': OnboardingState.FORM },
      { new: true }
    ));
  res.status(205).json({ message: 'Location updated successfully', code: 205 });
};

export const deleteLocation = async (req: Request, res: Response) => {
  logger.initReq = req;
  if (!req.params.id) {
    logger.debugMessage('Could not delete location - no ID specified');
    return res
      .status(422)
      .json({ message: 'Could not delete location - no ID specified', code: 422 });
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    logger.debugMessage('Could not delete location - invalid ID');
    return res.status(422).json({ message: 'Could not delete location - invalid ID', code: 422 });
  }

  const result = await db.location.deleteLocation(new mongoose.Types.ObjectId(req.params.id));

  if (!result) {
    logger.debugMessage(`Could not delete location`);
    return res.status(422).json({ message: 'Could not delete location', code: 422 });
  }

  logger.debugMessage('Location deleted successfully');
  res.status(200).json({ message: 'Location deleted successfully', code: 200 });
};

export const editLocation = async (req: Request, res: Response) => {
  logger.initReq = req;
  if (!req.params.id) {
    logger.debugMessage('Could not update location - ID is missing');
    return res
      .status(422)
      .json({ message: 'Could not update location - ID is missing', code: 422 });
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    logger.debugMessage('Could not update location - invalid ID');
    return res.status(422).json({ message: 'Could not update location - invalid ID', code: 422 });
  }

  const validation = ZLocation.safeParse(req.body);

  if (validation.success === false) {
    logger.debugMessage('Could not update location - Validation failed');
    return res.status(422).json({
      message: 'Could not update location - validation failed',
      code: 422,
      issues: validation.error.issues
    });
  }

  const location = await db.location.getLocation(new mongoose.Types.ObjectId(req.params.id));

  if (!location) {
    logger.debugMessage('Could not update location - excisting location not found');
    return res
      .status(422)
      .json({ message: 'Could not update location - excisting location not found', code: 422 });
  }

  logger.debugMessage('Validation success - Storing location information');

  const updatedLocation = {
    _id: location._id,
    companyId: location.companyId,
    ...validation.data
  };

  const unsets = createUpdateObject(location.toObject(), updatedLocation);

  const result = await db.location.editLocation(updatedLocation, unsets);

  if (!result) {
    logger.debugMessage('Could not update location - Could not save to the database');
    return res
      .status(422)
      .json({ message: 'Could not update location - Could not save to the database', code: 422 });
  }

  logger.debugMessage('Location updated successfully!');
  res.status(205).json({ message: 'Location updated successfully!', code: 205, data: result });
};

export const getLocations = async (req: Request, res: Response) => {
  logger.initReq = req;
  const authenticated = req.user as WithID<User>;

  if (!authenticated.company) {
    return res
      .status(422)
      .json({ message: 'Could not return location detailes - Company not set yet', code: 422 });
  }

  const result = await db.location.getLocations(authenticated.company);

  if (!result) {
    logger.debugMessage('Could not return location detailes - Company not found');
    return res
      .status(422)
      .json({ message: 'Could not return location detailes - Company not found', code: 422 });
  }

  logger.debugMessage('Returning location details');
  res.status(200).json(result);
};

export default { addLocation, deleteLocation, editLocation, getLocations };
