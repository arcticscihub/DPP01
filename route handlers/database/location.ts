import { ObjectId } from 'bson';

import { Location } from '../../models/';
import { Logger } from '../../util/logging';

const logger = new Logger('Location');

const addLocation = async (l: Location) => {
  try {
    const location = new Location(l);
    return await location.save();
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const deleteLocation = async (id: ObjectId) => {
  try {
    return await Location.deleteOne(id);
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const editLocation = async (l: Location, unset: {} = {}) => {
  try {
    return await Location.findOneAndUpdate(
      { _id: l._id },
      { $set: l, $unset: unset },
      {
        new: true
      }
    );
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getLocation = async (id: ObjectId) => {
  try {
    return await Location.findById(id);
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getLocations = async (companyId: ObjectId) => {
  try {
    return await Location.find({ companyId: companyId });
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

export default { addLocation, deleteLocation, editLocation, getLocation, getLocations };
