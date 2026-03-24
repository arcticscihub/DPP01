import { ObjectId } from 'bson';

import { Consumption } from '../../models/';
import { Logger } from '../../util/logging';

const logger = new Logger('Consumption');

const addConsumption = async (c: Consumption) => {
  try {
    const consumption = new Consumption(c);
    return await consumption.save();
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const editConsumption = async (c: Consumption, unset: {} = {}) => {
  try {
    return await Consumption.findOneAndUpdate(
      { _id: c._id },
      { $set: c, $unset: unset },
      {
        new: true
      }
    );
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getConsumption = async (id: ObjectId) => {
  try {
    return await Consumption.findById(id)
      .populate('location')
      .populate('relations.businessUnits')
      .populate('relations.assets');
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getConsumptions = async (queryObject: object = {}) => {
  try {
    return await Consumption.find(queryObject).populate('location');
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getTransportTypes = async (query: object) => {
  try {
    return await Consumption.find(query, { _id: 0, 'typeData.transportType': 1 });
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getTypes = async (query: object) => {
  try {
    return await Consumption.aggregate([
      { $match: query },
      { $unwind: '$data' },
      {
        $group: {
          _id: '$data.type',
          type: { $addToSet: '$data.type' }
        }
      },
      {
        $project: {
          _id: 0,
          type: 1
        }
      }
    ]);
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getUnits = async (query: object) => {
  try {
    return await Consumption.aggregate([
      { $match: query },
      { $unwind: '$data' },
      {
        $group: {
          _id: '$data.unit',
          usage: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          value: '$_id',
          usage: 1
        }
      }
    ]);
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

export default {
  addConsumption,
  editConsumption,
  getConsumption,
  getConsumptions,
  getTransportTypes,
  getTypes,
  getUnits
};
