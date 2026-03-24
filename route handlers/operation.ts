import { Request, Response } from 'express';
import mongoose from 'mongoose';

import db from './db';
import { createUpdateObject } from './util';
import { User } from '../models/';
import { ZOperation } from '../validators/';
import { Logger } from '../util/logging';
import { WithID } from '../util/types';

const logger = new Logger('Operations');

/* =========================
   Helpers
========================= */

const toObjectId = (id?: string) =>
  typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : undefined;

const isValidId = (id?: string) =>
  typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);

const handleValidationError = (res: Response, error: any, message: string) =>
  res.status(422).json({
    message,
    code: 422,
    issues: error?.issues
  });

/* =========================
   Controller logic
========================= */

export const addOperation = async (req: Request, res: Response) => {
  logger.initReq = req;

  const user = req.user as WithID<User>;

  if (!user.company) {
    return res.status(422).json({
      message: 'No company registered',
      code: 422
    });
  }

  const parsed = ZOperation.safeParse(req.body);

  if (!parsed.success) {
    logger.debugMessage('Operation validation failed');
    return handleValidationError(
      res,
      parsed.error,
      'Could not add operation - validation failed'
    );
  }

  logger.debugMessage(
    `Adding operation ${parsed.data.name ? `(${parsed.data.name})` : ''}`
  );

  const result = await db.operation.addOperation({
    ...parsed.data,
    locationId: toObjectId(parsed.data.locationId),
    companyId: user.company
  });

  if (!result) {
    return res.status(422).json({
      message: 'Could not save operation',
      code: 422
    });
  }

  return res.status(201).json({
    message: 'Operation added successfully',
    code: 201,
    data: result
  });
};

export const deleteOperation = async (req: Request, res: Response) => {
  logger.initReq = req;

  const { id } = req.params;

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

  const result = await db.operation.deleteOperation(toObjectId(id));

  if (!result) {
    return res.status(422).json({
      message: 'Could not delete operation',
      code: 422
    });
  }

  return res.status(200).json({
    message: 'Operation deleted successfully',
    code: 200
  });
};

export const editOperation = async (req: Request, res: Response) => {
  logger.initReq = req;

  const { id } = req.params;

  if (!id || !isValidId(id)) {
    return res.status(422).json({
      message: 'Invalid or missing ID',
      code: 422
    });
  }

  const parsed = ZOperation.safeParse(req.body);

  if (!parsed.success) {
    return handleValidationError(
      res,
      parsed.error,
      'Could not update operation - validation failed'
    );
  }

  const existing = await db.operation.getOperation(toObjectId(id));

  if (!existing) {
    return res.status(422).json({
      message: 'Operation not found',
      code: 422
    });
  }

  logger.debugMessage('Updating operation');

  const updatedOperation = {
    _id: existing._id,
    companyId: existing.companyId,
    ...parsed.data,
    locationId:
      parsed.data.locationId && isValidId(parsed.data.locationId)
        ? new mongoose.Types.ObjectId(parsed.data.locationId)
        : existing.locationId
  };

  const unsets = createUpdateObject(existing.toObject(), updatedOperation);

  const result = await db.operation.editOperation(updatedOperation, unsets);

  if (!result) {
    return res.status(422).json({
      message: 'Could not update operation',
      code: 422
    });
  }

  return res.status(205).json({
    message: 'Operation updated successfully',
    code: 205,
    data: result
  });
};

export const getOperations = async (req: Request, res: Response) => {
  logger.initReq = req;

  const user = req.user as WithID<User>;

  if (!user.company) {
    return res.status(422).json([]);
  }

  const result = await db.operation.getOperations(user.company);

  if (!result) {
    return res.status(422).json({
      message: 'Could not retrieve operations',
      code: 422
    });
  }

  return res.status(200).json(result);
};

export default {
  addOperation,
  deleteOperation,
  editOperation,
  getOperations
};
