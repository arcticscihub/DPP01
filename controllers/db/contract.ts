import { ObjectId } from 'bson';
import mongoose from 'mongoose';

import { Contract } from '../../models/';
import { Logger } from '../../util/logging';

const logger = new Logger('Contract');

const addContract = async (c: any) => {
  try {
    const contract = new Contract(c);
    return await contract.save();
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const deleteContract = async (id: string) => {
  return await Contract.findOneAndUpdate({ _id: id }, { status: 'deleted' }, { new: true });
};

const deleteMany = async (queryObject: object, permanent = false) => {
  if (permanent) {
    try {
      return (await Contract.deleteMany(queryObject)).deletedCount;
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

const editContract = async (c: any, unset: {} = {}) => {
  try {
    return await Contract.findOneAndUpdate(
      { _id: c._id },
      { $set: c, $unset: unset },
      { new: true }
    );
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getAggregated = async (unwind: string, query: object) => {
  try {
    return await Contract.aggregate([{ $unwind: unwind }, { $match: query }]);
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const deleteFile = async (
  contractID: mongoose.Types.ObjectId,
  deleteFileID: mongoose.Types.ObjectId
) => {
  try {
    return await Contract.updateOne(
      { _id: contractID },
      { $pull: { files: { _id: deleteFileID } } }
    );
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getContracts = async (query: object, fields?: object) => {
  return await Contract.find(query, fields)
    .populate({
      path: 'suppliers',
      populate: {
        path: 'supplier',
        model: 'Supplier',
        select: '-contact'
      }
    })
    .populate({
      path: 'suppliers',
      populate: {
        path: 'contacts',
        model: 'Contact'
      }
    })
    .populate({
      path: 'alternativeContracts',
      model: 'Contract'
    });
};

const getFile = async (
  contractID: mongoose.Types.ObjectId,
  documentID: mongoose.Types.ObjectId
) => {
  try {
    const contract = (await Contract.aggregate([
      { $unwind: '$files' },
      { $match: { _id: contractID, 'files._id': documentID } }
    ])) as any;
    console.log(contract);
    return contract[0].files;
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getMany = async (query: object, fields: object) => {
  try {
    return await Contract.find(query, fields);
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getSingleContract = async (id: string) => {
  try {
    return await Contract.findById(id)
      .populate({
        path: 'suppliers',
        populate: {
          path: 'supplier',
          model: 'Supplier',
          select: '-contact'
        }
      })
      .populate({
        path: 'suppliers',
        populate: {
          path: 'contacts',
          model: 'Contact'
        }
      })
      .populate({
        path: 'alternativeContracts',
        model: 'Contract'
      });
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const searchContracts = async (query: string, company?: ObjectId) => {
  const regex = new RegExp(`${query}`, 'i');
  try {
    return await Contract.find({
      $and: [
        { company: company },
        {
          $or: [
            { name: { $in: [regex] } },
            { description: { $in: [regex] } },
            { 'scope.mainCategory': { $in: [regex] } },
            { 'scope.subCategory': { $in: [regex] } },
            { 'scope.product': { $in: [regex] } }
          ]
        }
      ]
    });
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const updateMany = async (queryObject: object = {}, updateObject: object = {}) => {
  try {
    return (await Contract.updateMany(queryObject, updateObject)).modifiedCount;
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

export default {
  addContract,
  deleteContract,
  deleteFile,
  deleteMany,
  editContract,
  getAggregated,
  getContracts,
  getFile,
  getMany,
  getSingleContract,
  searchContracts,
  updateMany
};
