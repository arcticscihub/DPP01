import { ObjectId } from 'bson';

import { Asset } from '../../models/';
import { Logger } from '../../util/logging';

const logger = new Logger('Asset');

const addAsset = async (a: Asset) => {
  try {
    const asset = new Asset(a);
    return await asset.save();
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const deleteAsset = async (id: ObjectId) => {
  try {
    return await Asset.deleteOne(id);
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const editAsset = async (a: Asset, unset: {} = {}) => {
  try {
    return await Asset.findOneAndUpdate(
      { _id: a._id },
      { $set: a, $unset: unset },
      {
        new: true
      }
    );
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getAsset = async (id: ObjectId) => {
  return await Asset.findById(id);
};

const getAssets = async (companyId: ObjectId) => {
  try {
    return await Asset.find({ companyId: companyId });
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

export default { addAsset, deleteAsset, editAsset, getAsset, getAssets };
