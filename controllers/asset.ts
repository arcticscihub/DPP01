import { Request, Response } from 'express';
import mongoose from 'mongoose';

import db from './db';
import { createUpdateObject } from './util';

import { User } from '../models/';
import { Logger } from '../util/logging';
import { WithID } from '../util/types';
import { ZAsset } from '../validators/';

const logger = new Logger('Asset');

export const addAsset = async (req: Request, res: Response) => {
  const validation = ZAsset.safeParse({
    ...req.body,
    locationId: req.body.locationId ? req.body.locationId : undefined
  });
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;

  if (!authenticated.company) {
    logger.debugMessage('Could not add asset - no company registered');
    return res
      .status(422)
      .json({ message: 'Could not add asset - no company registered', code: 422 });
  }

  if (validation.success === false) {
    logger.debugMessage(`Could not add asset - validation failed`);
    return res.status(422).json({
      message: `Could not add asset - validation failed`,
      code: 422,
      issues: validation.error.issues
    });
  }

  if (
    typeof validation.data.locationId === 'string' &&
    !mongoose.Types.ObjectId.isValid(validation.data.locationId)
  ) {
    logger.debugMessage('Could not add asset - invalid location ID');
    return res
      .status(422)
      .json({ message: 'Could not add asset - invalid location ID', code: 422 });
  }

  logger.debugMessage(
    `Validation success - Storing asset ${
      validation.data.name ? `with name ${validation.data.name}` : `information`
    }`
  );

  const result = await db.asset.addAsset({
    ...validation.data,
    locationId: new mongoose.Types.ObjectId(validation.data.locationId),
    companyId: authenticated.company
  });

  if (!result) {
    logger.debugMessage(`Could not save asset to database`);
    return res.status(422).json({ message: 'Could not save asset to database', code: 422 });
  }

  logger.debugMessage('Asset added successfully');
  res.status(201).json({ message: 'Asset added successfully', code: 201, data: result });
};

export const deleteAsset = async (req: Request, res: Response) => {
  logger.initReq = req;
  if (!req.params.id) {
    logger.debugMessage('Could not delete asset - no ID specified');
    return res
      .status(422)
      .json({ message: 'Could not delete asset - no ID specified', code: 422 });
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    logger.debugMessage('Could not delete asset - invalid ID');
    return res.status(422).json({ message: 'Could not delete asset - invalid ID', code: 422 });
  }

  const consumptions = await db.consumption.getConsumptions({
    'typeData.assetId': new mongoose.Types.ObjectId(req.params.id)
  });

  if (!consumptions) {
    logger.debugMessage('Could not delete asset - unable to verify consumptions');
    return res
      .status(422)
      .json({ message: 'Could not delete asset - unable to verify consumptions', code: 422 });
  }

  if (consumptions.length > 0) {
    logger.debugMessage(
      `Could not delete asset - Asset has ${consumptions.length} registered consumptions`,
      req
    );
    return res.status(422).json({
      message: `Could not delete asset - Asset has ${consumptions.length} registered consumptions`,
      code: 422
    });
  }

  const result = await db.asset.deleteAsset(new mongoose.Types.ObjectId(req.params.id));

  if (!result) {
    logger.debugMessage(`Could not delete asset`);
    return res.status(422).json({ message: 'Could not delete asset', code: 422 });
  }

  logger.debugMessage('Asset deleted successfully');
  res.status(200).json({ message: 'Asset deleted successfully', code: 200 });
};

export const editAsset = async (req: Request, res: Response) => {
  logger.initReq = req;
  if (!req.params.id) {
    logger.debugMessage('Could not update asset - ID is missing');
    return res.status(422).json({ message: 'Could not update asset - ID is missing', code: 422 });
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    logger.debugMessage('Could not update asset - invalid ID');
    return res.status(422).json({ message: 'Could not update asset - invalid ID', code: 422 });
  }

  const validation = ZAsset.safeParse(req.body);

  if (validation.success === false) {
    logger.debugMessage('Could not update asset - Validation failed');
    return res.status(422).json({
      message: 'Could not update asset - validation failed',
      code: 422,
      issues: validation.error.issues
    });
  }

  const asset = await db.asset.getAsset(new mongoose.Types.ObjectId(req.params.id));

  if (!asset) {
    logger.debugMessage('Could not update asset - excisting asset not found');
    return res
      .status(422)
      .json({ message: 'Could not update asset - excisting asset not found', code: 422 });
  }

  logger.debugMessage('Validation success - Storing asset information');

  const updatedAsset = {
    _id: asset._id,
    companyId: asset.companyId,
    ...validation.data,
    locationId:
      validation.data.locationId && mongoose.Types.ObjectId.isValid(validation.data.locationId)
        ? new mongoose.Types.ObjectId(validation.data.locationId)
        : asset.locationId
  };

  const unsets = createUpdateObject(asset.toObject(), updatedAsset);

  const result = await db.asset.editAsset(updatedAsset, unsets);

  if (!result) {
    logger.debugMessage('Could not update asset - Could not save to the database');
    return res
      .status(422)
      .json({ message: 'Could not update asset - Could not save to the database', code: 422 });
  }

  logger.debugMessage('Asset updated successfully!');
  res.status(205).json({ message: 'Asset updated successfully!', code: 205, data: result });
};

export const getAssets = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;
  if (!authenticated.company) {
    logger.debugMessage('Could not get assets - no company registered');
    return res.status(422).json([]);
  }

  const result = await db.asset.getAssets(authenticated.company);

  if (!result) {
    logger.debugMessage(`Could not get assets from the database`);
    return res.status(422).json({ message: 'Could not get assets from the database', code: 422 });
  }

  logger.debugMessage('Assets retrieved successfully');
  res.status(200).json({ message: 'Assets retrieved successfully', code: 200, data: result });
};

export default { addAsset, deleteAsset, editAsset, getAssets };
