import { Request, Response } from 'express';
import mongoose from 'mongoose';

import db from './db';
import { createUpdateObject } from './util';

import { User } from '../models/';
import { ZOperation } from '../validators/';
import { Logger } from '../util/logging';
import { WithID } from '../util/types';

const logger = new Logger('Operations');

export const addOperation = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  const validation = ZOperation.safeParse(req.body);
  logger.initReq = req;

  if (!authenticated.company) {
    logger.debugMessage('Could not add operation - no company registered');
    return res
      .status(422)
      .json({ message: 'Could not add operation - no company registered', code: 422 });
  }

  if (validation.success === false) {
    logger.debugMessage(`Could not add operation - validation failed`);
    return res.status(422).json({
      message: `Could not add operation - validation failed`,
      code: 422,
      issues: validation.error.issues
    });
  }

  logger.debugMessage(
    `Validation success - Storing operation ${
      validation.data.name ? `with name ${validation.data.name}` : `information`
    }`
  );

  const location = validation.data.locationId
    ? new mongoose.Types.ObjectId(validation.data.locationId)
    : undefined;

  const result = await db.operation.addOperation({
    ...validation.data,
    locationId: location,
    companyId: authenticated.company
  });

  if (!result) {
    logger.debugMessage(`Could not save operation to database`);
    return res.status(422).json({ message: 'Could not save operation to database', code: 422 });
  }

  logger.debugMessage('Operation added successfully');
  res.status(201).json({ message: 'Operation added successfully', code: 201, data: result });
};

export const deleteOperation = async (req: Request, res: Response) => {
  logger.initReq = req;
  if (!req.params.id) {
    logger.debugMessage('Could not delete operation - no ID specified');
    return res
      .status(422)
      .json({ message: 'Could not delete operation - no ID specified', code: 422 });
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    logger.debugMessage('Could not delete operation - invalid ID');
    return res.status(422).json({ message: 'Could not delete operation - invalid ID', code: 422 });
  }

  const result = await db.operation.deleteOperation(new mongoose.Types.ObjectId(req.params.id));

  if (!result) {
    logger.debugMessage(`Could not delete operation`);
    return res.status(422).json({ message: 'Could not delete operation', code: 422 });
  }

  logger.debugMessage('Operation deleted successfully');
  res.status(200).json({ message: 'Operation deleted successfully', code: 200 });
};

export const editOperation = async (req: Request, res: Response) => {
  logger.initReq = req;
  if (!req.params.id) {
    logger.debugMessage('Could not update operation - ID is missing');
    return res
      .status(422)
      .json({ message: 'Could not update operation - ID is missing', code: 422 });
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    logger.debugMessage('Could not update operation - invalid ID');
    return res.status(422).json({ message: 'Could not update operation - invalid ID', code: 422 });
  }

  const validation = ZOperation.safeParse(req.body);

  if (validation.success === false) {
    logger.debugMessage('Could not update operation - Validation failed');
    return res.status(422).json({
      message: 'Could not update operation - validation failed',
      code: 422,
      issues: validation.error.issues
    });
  }

  const operation = await db.operation.getOperation(new mongoose.Types.ObjectId(req.params.id));

  if (!operation) {
    logger.debugMessage('Could not update operation - excisting operation not found');
    return res
      .status(422)
      .json({ message: 'Could not update operation - excisting operation not found', code: 422 });
  }

  logger.debugMessage('Validation success - Storing operation information');

  const updatedOperation = {
    _id: operation._id,
    companyId: operation.companyId,
    ...validation.data,
    locationId:
      validation.data.locationId && mongoose.Types.ObjectId.isValid(validation.data.locationId)
        ? new mongoose.Types.ObjectId(validation.data.locationId)
        : operation.locationId
  };

  const unsets = createUpdateObject(operation.toObject(), updatedOperation);

  const result = await db.operation.editOperation(updatedOperation, unsets);

  if (!result) {
    logger.debugMessage('Could not update operation - Could not save to the database');
    return res
      .status(422)
      .json({ message: 'Could not update operation - Could not save to the database', code: 422 });
  }

  logger.debugMessage('Operation updated successfully!');
  res.status(205).json({ message: 'Operation updated successfully!', code: 205, data: result });
};

export const getOperations = async (req: Request, res: Response) => {
  logger.initReq = req;
  const authenticated = req.user as WithID<User>;

  if (!authenticated.company) {
    logger.debugMessage('Could not get operations - no company registered');
    return res.status(422).json([]);
  }

  const result = await db.operation.getOperations(authenticated.company);

  if (!result) {
    logger.debugMessage(`Could not get operations from the database`);
    return res
      .status(422)
      .json({ message: 'Could not get operations from the database', code: 422 });
  }

  logger.debugMessage('Operations retrieved successfully');
  res.status(200).json(result);
};

export default { addOperation, deleteOperation, editOperation, getOperations };
