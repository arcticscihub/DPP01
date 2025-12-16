import { ObjectId } from 'bson';
import { Request, Response } from 'express';
import mongoose from 'mongoose';

import db from './db';
import { combineAndSortArrays, createUpdateObject, splitValueByMonth } from './util';

import { ConsumptionData, User } from '../models/';
import { Logger } from '../util/logging';
import { WithID } from '../util/types';
import { ZConsumption } from '../validators/';

const logger = new Logger('Consumption');

export const addConsumption = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  let businessUnitIds: ObjectId[] = [],
    assetIds: ObjectId[] = [],
    consumptionPeriods: ConsumptionData[] = [];

  const receivedConsumptionData = req.body.data.map((row: any) => {
    return {
      ...row,
      destinationTo:
        row.destinationTo && row.destinationTo.length > 0 ? row.destinationTo : undefined,
      destinationFrom:
        row.destinationFrom && row.destinationFrom.length > 0 ? row.destinationFrom : undefined
    };
  });

  const validation = ZConsumption.safeParse({ ...req.body, data: receivedConsumptionData });
  logger.initReq = req;
  if (validation.success === false) {
    logger.debugMessage(`Could not add consumption data - validation failed`);
    return res.status(422).json({
      message: `Could not add consumption data - validation failed`,
      code: 422,
      issues: validation.error.issues
    });
  }

  console.log(validation.data);

  logger.debugMessage(`Validation success - Storing ${validation.data.type} consumption`);

  for (const id in validation.data.relations.businessUnitIds) {
    businessUnitIds.push(
      new mongoose.Types.ObjectId(validation.data.relations.businessUnitIds[id])
    );
  }

  for (const id in validation.data.relations.assetIds) {
    assetIds.push(new mongoose.Types.ObjectId(validation.data.relations.assetIds[id]));
  }

  for (const period in validation.data.data) {
    consumptionPeriods.push({
      ...validation.data.data[period],
      periodStart: new Date(validation.data.data[period].periodStart),
      periodEnd: new Date(validation.data.data[period].periodEnd),
      value:
        typeof validation.data.data[period].value === 'number'
          ? validation.data.data[period].value
          : typeof validation.data.data[period].kilometers === 'number'
          ? validation.data.data[period].kilometers
          : 0
    });
  }

  const result = await db.consumption.addConsumption({
    ...validation.data,
    company: authenticated.company,
    location:
      typeof validation.data.locationId === 'string' &&
      mongoose.Types.ObjectId.isValid(validation.data.locationId)
        ? new mongoose.Types.ObjectId(validation.data.locationId)
        : undefined,
    typeData: validation.data.typeData
      ? {
          ...validation.data.typeData,
          assetId:
            typeof validation.data.typeData.assetId === 'string' &&
            mongoose.Types.ObjectId.isValid(validation.data.typeData.assetId)
              ? new mongoose.Types.ObjectId(validation.data.typeData.assetId)
              : undefined
        }
      : undefined,
    relations: { businessUnits: businessUnitIds, assets: assetIds },
    data: consumptionPeriods
  });

  if (!result) {
    logger.debugMessage(`Could not save consumption data to database`);
    return res
      .status(422)
      .json({ message: 'Could not save consumption data to database', code: 422 });
  }

  logger.debugMessage('Consumptions saved successfully');
  res.status(201).json({ message: `Consumptions added successfully`, code: 201 });
};

export const editConsumption = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  let businessUnitIds: ObjectId[] = [],
    assetIds: ObjectId[] = [],
    consumptionPeriods: ConsumptionData[] = [];
  logger.initReq = req;

  if (!req.params.id) {
    logger.debugMessage('Could not update consumption - ID is missing');
    return res
      .status(422)
      .json({ message: 'Could not update consumption - ID is missing', code: 422 });
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    logger.debugMessage('Could not update consumption - invalid ID');
    return res
      .status(422)
      .json({ message: 'Could not update consumption - invalid ID', code: 422 });
  }

  const consumptionData: any[] = [];

  for (const period in req.body.data) {
    consumptionData.push({
      ...req.body.data[period],
      kilometers:
        typeof req.body.data[period].kilometers === 'string'
          ? Number(req.body.data[period].kilometers)
          : req.body.data[period].kilometers,
      value:
        typeof req.body.data[period].value === 'string'
          ? Number(req.body.data[period].value)
          : req.body.data[period].value
    });
  }

  const validation = ZConsumption.safeParse({ ...req.body, data: consumptionData });

  if (validation.success === false) {
    logger.debugMessage('Could not update consumption - Validation failed');
    return res.status(422).json({
      message: 'Could not update consumption - validation failed',
      code: 422,
      issues: validation.error.issues
    });
  }

  const consumption = await db.consumption.getConsumption(
    new mongoose.Types.ObjectId(req.params.id)
  );

  if (!consumption) {
    logger.debugMessage('Could not update consumption - excisting consumption not found');
    return res.status(422).json({
      message: 'Could not update consumption - excisting consumption not found',
      code: 422
    });
  }

  logger.debugMessage('Validation success - Storing asset information');

  for (const id in validation.data.relations.businessUnitIds) {
    businessUnitIds.push(
      new mongoose.Types.ObjectId(validation.data.relations.businessUnitIds[id])
    );
  }

  for (const id in validation.data.relations.assetIds) {
    assetIds.push(new mongoose.Types.ObjectId(validation.data.relations.assetIds[id]));
  }

  for (const period in validation.data.data) {
    consumptionPeriods.push({
      ...validation.data.data[period],
      periodStart: new Date(validation.data.data[period].periodStart),
      periodEnd: new Date(validation.data.data[period].periodEnd),
      value:
        validation.data.data[period].value || validation.data.data[period].kilometers || undefined
    });
  }

  const updatedConsumptions = {
    _id: consumption._id,
    ...validation.data,
    company: authenticated.company,
    location:
      typeof validation.data.locationId === 'string' &&
      mongoose.Types.ObjectId.isValid(validation.data.locationId)
        ? new mongoose.Types.ObjectId(validation.data.locationId)
        : undefined,
    typeData: validation.data.typeData
      ? {
          ...validation.data.typeData,
          assetId:
            typeof validation.data.typeData.assetId === 'string' &&
            mongoose.Types.ObjectId.isValid(validation.data.typeData.assetId)
              ? new mongoose.Types.ObjectId(validation.data.typeData.assetId)
              : undefined
        }
      : undefined,
    relations: { businessUnits: businessUnitIds, assets: assetIds },
    data: consumptionPeriods
  };

  const unsets = createUpdateObject(consumption.toObject(), updatedConsumptions);

  const result = await db.consumption.editConsumption(updatedConsumptions, unsets);

  if (!result) {
    logger.debugMessage('Could not update consumption - Could not save to the database');
    return res.status(422).json({
      message: 'Could not update consumption - Could not save to the database',
      code: 422
    });
  }

  logger.debugMessage('Consumption updated successfully!');
  res.status(205).json({ message: 'Consumption updated successfully!', code: 205, data: result });
};

export const getAggregatedData = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  const consumptionsArray: { value: number; month: string; type?: string }[] = [];
  interface IQueryObj {
    type: string;
    state: string;
    company?: ObjectId;
    data: {
      $elemMatch: {
        periodStart: { $gte: Date };
        periodEnd: { $lte: Date };
        unit?: string;
      };
    };
    location?: { $in: ObjectId[] };
    'typeData.assetId'?: { $exists?: boolean; $in?: ObjectId };
    'relations.businessUnits'?: { $in: ObjectId[] };
    'relations.assets'?: { $in: ObjectId[] };
    $or?: any[];
  }
  logger.initReq = req;

  const queryObject: IQueryObj = {
    type: req.body.type,
    state: req.body.state ? req.body.state : 'active',
    company: authenticated.company,
    data: {
      $elemMatch: {
        periodStart: { $gte: new Date(req.body.startDate) },
        periodEnd: { $lte: new Date(req.body.endDate) }
      }
    }
  };
  req.body.unit
    ? (queryObject.data.$elemMatch.unit = req.body.unit)
    : req.body.filter && req.body.filter.unit
    ? (queryObject.data.$elemMatch.unit = req.body.filter.unit)
    : undefined;
  req.body.locationFilter &&
    (queryObject.location = {
      $in: req.body.locationFilter.map((id: any) => {
        if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id))
          return new mongoose.Types.ObjectId(id);
      })
    });
  req.body.typeFilter
    ? req.body.typeFilter.assetId
      ? (queryObject['typeData.assetId'] = { $exists: true })
      : (queryObject['typeData.assetId'] = { $exists: false })
    : undefined;
  req.body.operationFilter &&
    (queryObject['relations.businessUnits'] = {
      $in: req.body.operationFilter
        .filter((id: string) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id))
        .map((id: string) => new mongoose.Types.ObjectId(id))
    });
  if (req.body.assetFilter) {
    if (req.body.type !== 'TRANSPORT') {
      queryObject['relations.assets'] = {
        $in: req.body.assetFilter
          .filter((id: string) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id))
          .map((id: string) => new mongoose.Types.ObjectId(id))
      };
    } else {
      if (req.body.typeFilter) {
        delete queryObject['typeData.assetId'];
        queryObject.$or = [
          {
            'typeData.assetId': {
              $exists: req.body.typeFilter.assetId ? true : false,
              $in: req.body.assetFilter
                .filter(
                  (id: string) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
                )
                .map((id: string) => new mongoose.Types.ObjectId(id))
            }
          },
          {
            'relations.assets': {
              $in: req.body.assetFilter
                .filter(
                  (id: string) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
                )
                .map((id: string) => new mongoose.Types.ObjectId(id))
            }
          }
        ];
      } else {
        queryObject.$or = [
          {
            'typeData.assetId': {
              $in: req.body.assetFilter
                .filter(
                  (id: string) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
                )
                .map((id: string) => new mongoose.Types.ObjectId(id))
            }
          },
          {
            'relations.assets': {
              $in: req.body.assetFilter
                .filter(
                  (id: string) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
                )
                .map((id: string) => new mongoose.Types.ObjectId(id))
            }
          }
        ];
      }
    }
  }

  const result = await db.consumption.getConsumptions(queryObject);

  if (!result) {
    logger.debugMessage('Could not retrieve aggregated consumption data');
    return res.status(422).send();
  }

  for (const consumption in result) {
    for (const period in result[consumption].data) {
      const parseData = splitValueByMonth({
        from: result[consumption].data[period].periodStart,
        to: result[consumption].data[period].periodEnd,
        value: (result[consumption].data[period].value ||
          result[consumption].data[period].kilometers) as number
      });

      for (const part in parseData) {
        consumptionsArray.push({
          value: parseData[part].value,
          month: parseData[part].date,
          type: req.body.groupBy && result[consumption].data[period].type
        });
      }
    }
  }

  logger.debugMessage('Aggregated consumption data retrieved successfully');
  res.status(200).json(consumptionsArray);
};

export const getConsumption = async (req: Request, res: Response) => {
  logger.initReq = req;
  if (!req.params.id) {
    logger.debugMessage('Could not get consumption - ID is missing');
    return res
      .status(422)
      .json({ message: 'Could not get consumption - ID is missing', code: 422 });
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    logger.debugMessage('Could not get consumption - invalid ID');
    return res.status(422).json({ message: 'Could not get consumption - invalid ID', code: 422 });
  }

  const result = await db.consumption.getConsumption(new mongoose.Types.ObjectId(req.params.id));

  if (!result) {
    logger.debugMessage(`Could not get consumption`);
    return res.status(422).json({ message: 'Could not get consumption', code: 422 });
  }

  res.status(200).json(result);
};

export const getConsumptionsDetailed = async (req: Request, res: Response) => {
  logger.initReq = req;
  const authenticated = req.user as WithID<User>;
  const consumptionPeriods: {}[] = [];
  const result = await db.consumption.getConsumptions({
    company: authenticated.company,
    ...(req.body.type && { type: req.body.type }),
    ...(req.body.state && { state: req.body.state.toLowerCase() })
  });

  if (!result) {
    logger.debugMessage('Could not fetch detailed consumptions');
    return res.status(422).json({ message: 'Could not fetch detailed consumptions', code: 422 });
  }

  for (const consumption in result) {
    for (const period in result[consumption].data) {
      consumptionPeriods.push({
        _id: result[consumption].data[period]._id,
        type: result[consumption].type,
        value:
          typeof result[consumption].data[period].value === 'number'
            ? result[consumption].data[period].value
            : typeof result[consumption].data[period].kilometers === 'number'
            ? result[consumption].data[period].kilometers
            : 0,
        formId: result[consumption]._id,
        state: result[consumption].state,
        location: result[consumption].location,
        periodStart: result[consumption].data[period].periodStart,
        periodEnd: result[consumption].data[period].periodEnd,
        unit:
          result[consumption].data[period].unit ||
          (result[consumption].data[period].kilometers && 'km'),
        relationCount:
          Number(result[consumption].relations.assets.length || 0) +
          Number(result[consumption].relations.businessUnits.length || 0),
        transportType:
          req.body.type === 'TRANSPORT' && result[consumption].typeData
            ? result[consumption].typeData?.transportType
              ? 'Non-asset'
              : 'Asset'
            : undefined
      });
    }
  }
  console.log(consumptionPeriods);
  res.status(200).json({ state: 'Active', type: req.body.type, items: consumptionPeriods });
};

export const getTypes = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;
  if (!req.params.category) {
    logger.debugMessage('Could not get types - consumption category missing');
    return res
      .status(422)
      .json({ message: 'Could not get types - consumption category missing', code: 422 });
  }

  const result =
    req.params.category === 'TRANSPORT'
      ? (
          await db.consumption.getTransportTypes({
            type: 'TRANSPORT',
            company: authenticated.company
          })
        )
          ?.filter(item => item.typeData && item.typeData.transportType)
          .map(item => item.typeData?.transportType)
      : (
          await db.consumption.getTypes({
            type: req.params.category,
            company: authenticated.company
          })
        )
          ?.filter(item => item.type)
          .map(item => item.type);

  if (!result) {
    return res.status(422).send();
  }

  const types = combineAndSortArrays(result);

  req.params.category === 'TRANSPORT'
    ? res.status(200).json({
        public: ['Bus', 'Ferry', 'Metro', 'Train', 'Tram', 'Ship', 'Plane'],
        notPublic: ['Car', 'Truck', 'Van'],
        custom: types
      })
    : res.status(200).json(types);
};

export const getUnits = async (req: Request, res: Response) => {
  logger.initReq = req;
  const authenticated = req.user as WithID<User>;
  if (!req.params.category) {
    logger.debugMessage('Could not get units - consumption category missing');
    return res
      .status(422)
      .json({ message: 'Could not get units - consumption category missing', code: 422 });
  }

  const result = await db.consumption.getUnits({
    type: req.params.category,
    company: authenticated.company
  });

  if (!result) {
    return res.status(422).send();
  }
  res.status(200).json(result);
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
