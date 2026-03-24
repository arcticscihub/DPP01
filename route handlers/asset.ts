import { Request, Response } from 'express';
import mongoose from 'mongoose';

import db from './db';
import { createUpdateObject } from './util';

import { User } from '../models';
import { Logger } from '../util/logging';
import { WithID } from '../util/types';
import { ZAsset } from '../validators';

const log = new Logger('Assets');

/**
 * Helpers
 */
const fail = (res: Response, message: string, code = 422, extra = {}) =>
  res.status(code).json({ message, code, ...extra });

const isValidObjectId = (id?: string) =>
  !!id && mongoose.Types.ObjectId.isValid(id);

const getUser = (req: Request) => req.user as WithID<User>;

/**
 * Create asset
 */
export const createAsset = async (req: Request, res: Response) => {
  log.initReq = req;

  const user = getUser(req);

  if (!user.company) {
    log.debugMessage('Asset creation failed - missing company');
    return fail(res, 'Missing company');
  }

  const payload = {
    ...req.body,
    locationId: req.body.locationId || undefined
  };

  const parsed = ZAsset.safeParse(payload);

  if (!parsed.success) {
    log.debugMessage('Asset validation failed');
    return fail(res, 'Validation failed', 422, {
      issues: parsed.error.issues
    });
  }

  if (parsed.data.locationId && !isValidObjectId(parsed.data.locationId)) {
    log.debugMessage('Asset creation failed - invalid location');
    return fail(res, 'Invalid location ID');
  }

  const data = parsed.data;

  log.debugMessage(
    `Storing asset ${data.name ? `(${data.name})` : ''}`
  );

  const created = await db.asset.addAsset({
    ...data,
    locationId: new mongoose.Types.ObjectId(data.locationId),
    companyId: user.company
  });

  if (!created) {
    log.debugMessage('Asset creation failed - DB error');
    return fail(res, 'Could not save asset');
  }

  log.debugMessage('Asset created successfully');
  return res.status(201).json({
    message: 'Asset created',
    code: 201,
    data: created
  });
};

/**
 * Remove asset
 */
export const removeAsset = async (req: Request, res: Response) => {
  log.initReq = req;

  const { id } = req.params;

  if (!isValidObjectId(id)) {
    log.debugMessage('Delete failed - invalid or missing ID');
    return fail(res, 'Invalid asset ID');
  }

  const objectId = new mongoose.Types.ObjectId(id);

  const usage = await db.consumption.getConsumptions({
    'typeData.assetId': objectId
  });

  if (!usage) {
    return fail(res, 'Unable to verify asset usage');
  }

  if (usage.length > 0) {
    log.debugMessage(`Delete blocked - ${usage.length} dependencies`);
    return fail(res, `Asset has ${usage.length} linked records`);
  }

  const deleted = await db.asset.deleteAsset(objectId);

  if (!deleted) {
    return fail(res, 'Deletion failed');
  }

  log.debugMessage('Asset removed');
  return res.status(200).json({ message: 'Deleted', code: 200 });
};

/**
 * Update asset
 */
export const updateAsset = async (req: Request, res: Response) => {
  log.initReq = req;

  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return fail(res, 'Invalid asset ID');
  }

  const parsed = ZAsset.safeParse(req.body);

  if (!parsed.success) {
    return fail(res, 'Validation failed', 422, {
      issues: parsed.error.issues
    });
  }

  const objectId = new mongoose.Types.ObjectId(id);

  const existing = await db.asset.getAsset(objectId);

  if (!existing) {
    return fail(res, 'Asset not found');
  }

  const data = parsed.data;

  const nextState = {
    _id: existing._id,
    companyId: existing.companyId,
    ...data,
    locationId:
      data.locationId && isValidObjectId(data.locationId)
        ? new mongoose.Types.ObjectId(data.locationId)
        : existing.locationId
  };

  const diff = createUpdateObject(existing.toObject(), nextState);

  const updated = await db.asset.editAsset(nextState, diff);

  if (!updated) {
    return fail(res, 'Update failed');
  }

  log.debugMessage('Asset updated');

  return res.status(200).json({
    message: 'Updated',
    code: 200,
    data: updated
  });
};

/**
 * Get all assets for company
 */
export const listAssets = async (req: Request, res: Response) => {
  log.initReq = req;

  const user = getUser(req);

  if (!user.company) {
    log.debugMessage('Fetch failed - no company');
    return res.status(200).json({ data: [] });
  }

  const assets = await db.asset.getAssets(user.company);

  if (!assets) {
    return fail(res, 'Could not retrieve assets');
  }

  log.debugMessage('Assets retrieved');

  return res.status(200).json({
    message: 'Success',
    code: 200,
    data: assets
  });
};

export default {
  createAsset,
  removeAsset,
  updateAsset,
  listAssets
};
