import { Request, Response } from 'express';
import mongoose from 'mongoose';

import db from './db';
import { combineAndSortArrays, createUpdateObject, splitValueByMonth } from './util';
import { ConsumptionData, User } from '../models/';
import { Logger } from '../util/logging';
import { WithID } from '../util/types';
import { ZConsumption } from '../validators/';

const logger = new Logger('Consumption');

/* =========================
   Utils
========================= */

const toObjectId = (id?: string) =>
  typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : undefined;

const mapIds = (ids: string[] = []) =>
  ids
    .filter(id => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id))
    .map(id => new mongoose.Types.ObjectId(id));

const mapPeriods = (data: any[] = []) =>
  data.map(period => ({
    ...period,
    periodStart: new Date(period.periodStart),
    periodEnd: new Date(period.periodEnd),
    value: Number(period.value ?? period.kilometers ?? 0)
  }));

const normaliseConsumptionInput = (body: any) => {
  const data = (body.data || []).map((row: any) => ({
    ...row,
    destinationTo: row.destinationTo?.length ? row.destinationTo : undefined,
    destinationFrom: row.destinationFrom?.length ? row.destinationFrom : undefined
  }));

  return { ...body, data };
};

const normaliseEditPeriods = (data: any[] = []) =>
  data.map(period => ({
    ...period,
    kilometers:
      typeof period.kilometers === 'string'
        ? Number(period.kilometers)
        : period.kilometers,
    value:
      typeof period.value === 'string'
        ? Number(period.value)
        : period.value
  }));

const buildQuery = (body: any, company: mongoose.Types.ObjectId) => {
  const query: any = {
    type: body.type,
    state: body.state || 'active',
    company,
    data: {
      $elemMatch: {
        periodStart: { $gte: new Date(body.startDate) },
        periodEnd: { $lte: new Date(body.endDate) }
      }
    }
  };

  if (body.unit || body?.filter?.unit) {
    query.data.$elemMatch.unit = body.unit || body.filter.unit;
  }

  if (body.locationFilter) {
    query.location = {
      $in: body.locationFilter
        .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
        .map((id: string) => new mongoose.Types.ObjectId(id))
    };
  }

  if (body.operationFilter) {
    query['relations.businessUnits'] = {
      $in: mapIds(body.operationFilter)
    };
  }

  if (body.assetFilter) {
    query['relations.assets'] = {
      $in: mapIds(body.assetFilter)
    };
  }

  return query;
};

/* =========================
   Controllers
========================= */

export const addConsumption = async (req: Request, res: Response) => {
  const user = req.user as WithID<User>;

  const parsed = ZConsumption.safeParse(
    normaliseConsumptionInput(req.body)
  );

  logger.initReq = req;

  if (!parsed.success) {
    return res.status(422).json({
      message: 'Could not add consumption data - validation failed',
      code: 422,
      issues: parsed.error.issues
    });
  }

  const result = await db.consumption.addConsumption({
    ...parsed.data,
    company: user.company,
    location: toObjectId(parsed.data.locationId),
    typeData: parsed.data.typeData
      ? {
          ...parsed.data.typeData,
          assetId: toObjectId(parsed.data.typeData.assetId)
        }
      : undefined,
    relations: {
      businessUnits: mapIds(parsed.data.relations.businessUnitIds),
      assets: mapIds(parsed.data.relations.assetIds)
    },
    data: mapPeriods(parsed.data.data)
  });

  if (!result) {
    return res.status(422).json({
      message: 'Could not save consumption data to database',
      code: 422
    });
  }

  return res.status(201).json({
    message: 'Consumptions added successfully',
    code: 201
  });
};

export const editConsumption = async (req: Request, res: Response) => {
  const user = req.user as WithID<User>;

  logger.initReq = req;

  if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(422).json({
      message: 'Invalid ID',
      code: 422
    });
  }

  const existing = await db.consumption.getConsumption(
    new mongoose.Types.ObjectId(req.params.id)
  );

  if (!existing) {
    return res.status(422).json({
      message: 'Consumption not found',
      code: 422
    });
  }

  const parsed = ZConsumption.safeParse({
    ...req.body,
    data: normaliseEditPeriods(req.body.data)
  });

  if (!parsed.success) {
    return res.status(422).json({
      message: 'Validation failed',
      code: 422,
      issues: parsed.error.issues
    });
  }

  const updated = {
    _id: existing._id,
    ...parsed.data,
    company: user.company,
    location: toObjectId(parsed.data.locationId),
    typeData: parsed.data.typeData
      ? {
          ...parsed.data.typeData,
          assetId: toObjectId(parsed.data.typeData.assetId)
        }
      : undefined,
    relations: {
      businessUnits: mapIds(parsed.data.relations.businessUnitIds),
      assets: mapIds(parsed.data.relations.assetIds)
    },
    data: mapPeriods(parsed.data.data)
  };

  const unsets = createUpdateObject(existing.toObject(), updated);

  const result = await db.consumption.editConsumption(updated, unsets);

  if (!result) {
    return res.status(422).json({
      message: 'Could not save updated consumption',
      code: 422
    });
  }

  return res.status(205).json(result);
};

export const getAggregatedData = async (req: Request, res: Response) => {
  const user = req.user as WithID<User>;
  logger.initReq = req;

  const query = buildQuery(req.body, user.company);

  const result = await db.consumption.getConsumptions(query);

  if (!result) {
    return res.status(422).send();
  }

  const output: any[] = [];

  result.forEach((entry: any) => {
    entry.data.forEach((period: any) => {
      const split = splitValueByMonth({
        from: period.periodStart,
        to: period.periodEnd,
        value: period.value || period.kilometers
      });

      split.forEach((part: any) => {
        output.push({
          value: part.value,
          month: part.date,
          type: req.body.groupBy ? period.type : undefined
        });
      });
    });
  });

  return res.status(200).json(output);
};

export const getConsumption = async (req: Request, res: Response) => {
  logger.initReq = req;

  if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(422).json({
      message: 'Invalid ID',
      code: 422
    });
  }

  const result = await db.consumption.getConsumption(
    new mongoose.Types.ObjectId(req.params.id)
  );

  if (!result) {
    return res.status(422).json({
      message: 'Could not get consumption',
      code: 422
    });
  }

  return res.status(200).json(result);
};

export const getConsumptionsDetailed = async (req: Request, res: Response) => {
  logger.initReq = req;

  const user = req.user as WithID<User>;

  const result = await db.consumption.getConsumptions({
    company: user.company,
    ...(req.body.type && { type: req.body.type }),
    ...(req.body.state && { state: req.body.state.toLowerCase() })
  });

  if (!result) {
    return res.status(422).json({
      message: 'Could not fetch detailed consumptions',
      code: 422
    });
  }

  const items: any[] = [];

  result.forEach((consumption: any) => {
    consumption.data.forEach((period: any) => {
      items.push({
        _id: period._id,
        type: consumption.type,
        value:
          typeof period.value === 'number'
            ? period.value
            : typeof period.kilometers === 'number'
            ? period.kilometers
            : 0,
        formId: consumption._id,
        state: consumption.state,
        location: consumption.location,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        unit: period.unit || (period.kilometers && 'km'),
        relationCount:
          (consumption.relations?.assets?.length || 0) +
          (consumption.relations?.businessUnits?.length || 0),
        transportType:
          req.body.type === 'TRANSPORT' && consumption.typeData
            ? consumption.typeData?.transportType
              ? 'Non-asset'
              : 'Asset'
            : undefined
      });
    });
  });

  return res.status(200).json({
    state: 'Active',
    type: req.body.type,
    items
  });
};

export const getTypes = async (req: Request, res: Response) => {
  const user = req.user as WithID<User>;
  logger.initReq = req;

  if (!req.params.category) {
    return res.status(422).json({
      message: 'Category missing',
      code: 422
    });
  }

  const result =
    req.params.category === 'TRANSPORT'
      ? (
          await db.consumption.getTransportTypes({
            type: 'TRANSPORT',
            company: user.company
          })
        )
          ?.filter((i: any) => i.typeData?.transportType)
          .map((i: any) => i.typeData.transportType)
      : (
          await db.consumption.getTypes({
            type: req.params.category,
            company: user.company
          })
        )
          ?.filter((i: any) => i.type)
          .map((i: any) => i.type);

  if (!result) {
    return res.status(422).send();
  }

  const types = combineAndSortArrays(result);

  return req.params.category === 'TRANSPORT'
    ? res.status(200).json({
        public: ['Bus', 'Ferry', 'Metro', 'Train', 'Tram', 'Ship', 'Plane'],
        notPublic: ['Car', 'Truck', 'Van'],
        custom: types
      })
    : res.status(200).json(types);
};

export const getUnits = async (req: Request, res: Response) => {
  const user = req.user as WithID<User>;
  logger.initReq = req;

  if (!req.params.category) {
    return res.status(422).json({
      message: 'Category missing',
      code: 422
    });
  }

  const result = await db.consumption.getUnits({
    type: req.params.category,
    company: user.company
  });

  if (!result) {
    return res.status(422).send();
  }

  return res.status(200).json(result);
};

export default {
  addConsumption,
  editConsumption,
  getAggregatedData,
  getConsumption,
  getConsumptionsDetailed,
  getTypes,
  getUnits
};
