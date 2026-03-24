import { ObjectId } from 'bson';

import { Operation } from '../../models/';
import { Logger } from '../../util/logging';

const logger = new Logger('Operation');

const addOperation = async (o: Operation) => {
  try {
    const operation = new Operation(o);
    return await operation.save();
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const deleteOperation = async (id: ObjectId) => {
  try {
    return await Operation.deleteOne(id);
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const editOperation = async (o: Operation, unset: {} = {}) => {
  try {
    return await Operation.findOneAndUpdate(
      { _id: o._id },
      { $set: o, $unset: unset },
      {
        new: true
      }
    );
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getOperation = async (id: ObjectId) => {
  try {
    return await Operation.findById(id);
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getOperations = async (companyId: ObjectId) => {
  try {
    return await Operation.find({ companyId: companyId });
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

export default { addOperation, deleteOperation, editOperation, getOperation, getOperations };
