import { ObjectId } from 'bson';

import { Supplier } from '../../models/';
import { Logger } from '../../util/logging';
import { WithID } from '../../util/types';

const logger = new Logger('Supplier');

const addSupplier = async (s: Supplier) => {
  try {
    const supplier = new Supplier(s);
    return await supplier.save();
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const deleteSupplier = async (id: string) => {
  return await Supplier.findOneAndUpdate({ _id: id }, { status: 'deleted' }, { new: true });
};

const deleteMany = async (queryObject: object, permanent = false) => {
  if (permanent) {
    try {
      return (await Supplier.deleteMany(queryObject)).deletedCount;
    } catch (error: any) {
      logger.errorMessage(error?.message);
      return null;
    }
  }

  try {
    return await updateMany(queryObject, { status: 'deleted' });
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const editSupplier = async (s: WithID<Supplier>, unset: {} = {}) => {
  try {
    return await Supplier.findOneAndUpdate(
      { _id: s._id },
      { $set: s, $unset: unset },
      {
        new: true
      }
    );
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getSingleSupplier = async (id: string) => {
  return await Supplier.findById(id).populate('contact');
};

const getSuppliers = async (query: object, fields?: object) => {
  try {
    return await Supplier.find(query, fields).populate('contact');
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const searchSuppliers = async (query: string, company?: ObjectId) => {
  const regex = new RegExp(`${query}`, 'i');
  try {
    return await Supplier.find({
      $and: [
        { company: company },
        { $or: [{ name: { $in: [regex] } }, { industry: { $in: [regex] } }] }
      ]
    }).sort({ name: 1 });
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const updateMany = async (queryObject: object = {}, updateObject: object = {}) => {
  try {
    return (await Supplier.updateMany(queryObject, updateObject)).modifiedCount;
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

export default {
  addSupplier,
  deleteMany,
  deleteSupplier,
  editSupplier,
  getSingleSupplier,
  getSuppliers,
  searchSuppliers
};
