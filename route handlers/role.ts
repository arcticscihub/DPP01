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

const response = (
  res: Response,
  status: number,
  message?: string,
  data?: any,
  extra: Record<string, any> = {}
) => {
  return res.status(status).json({
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
    ...extra
  });
};

const validationError = (res: Response, error: any, message: string) =>
  response(res, 422, message, undefined, {
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
    return response(res, 422, 'No company registered', undefined, { code: 422 });
  }

  const parsed = ZOperation.safeParse(req.body);

  if (!parsed.success) {
    logger.debugMessage('Operation validation failed');
    return validationError(
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
    return response(res, 422, 'Could not save operation', undefined, {
      code: 422
    });
  }

  return response(res, 201, 'Operation added successfully', result, {
    code: 201
  });
};

export const deleteOperation = async (req: Request, res: Response) => {
  logger.initReq = req;

  const { id } = req.params;

  if (!id || !isValidId(id)) {
    return response(res, 422, 'Invalid or missing ID', undefined, { code: 422 });
  }

  const result = await db.operation.deleteOperation(toObjectId(id));

  if (!result) {
    return response(res, 422, 'Could not delete operation', undefined, {
      code: 422
    });
  }

  return response(res, 200, 'Operation deleted successfully', undefined, {
    code: 200
  });
};

export const editOperation = async (req: Request, res: Response) => {
  logger.initReq = req;

  const { id } = req.params;

  if (!id || !isValidId(id)) {
    return response(res, 422, 'Invalid or missing ID', undefined, { code: 422 });
  }

  const parsed = ZOperation.safeParse(req.body);

  if (!parsed.success) {
    return validationError(
      res,
      parsed.error,
      'Could not update operation - validation failed'
    );
  }

  const existing = await db.operation.getOperation(toObjectId(id));

  if (!existing) {
    return response(res, 422, 'Operation not found', undefined, { code: 422 });
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
    return response(res, 422, 'Could not update operation', undefined, {
      code: 422
    });
  }

  return response(res, 205, 'Operation updated successfully', result, {
    code: 205
  });
};

export const getOperations = async (req: Request, res: Response) => {
  logger.initReq = req;

  const user = req.user as WithID<User>;

  if (!user.company) {
    return response(res, 200, undefined, []);
  }

  const result = await db.operation.getOperations(user.company);

  if (!result) {
    return response(res, 422, 'Could not retrieve operations', undefined, {
      code: 422
    });
  }

  return response(res, 200, undefined, result);
};

export default {
  addOperation,
  deleteOperation,
  editOperation,
  getOperations
};
