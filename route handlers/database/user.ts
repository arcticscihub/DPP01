import { ObjectId } from 'bson';

import { User } from '../../models/';
import { Logger } from '../../util/logging';
import { WithID } from '../../util/types';

const logger = new Logger('User');

const addFavourite = async (userId: ObjectId, contractId: string) => {
  try {
    return await User.findOneAndUpdate(
      { _id: userId },
      { $push: { 'favourites.contracts': contractId } },
      { new: true }
    );
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const addNote = async (userId: ObjectId, note: object) => {
  try {
    return await User.findOneAndUpdate(
      { _id: userId },
      { $push: { 'notes.contracts': note } },
      { new: true }
    );
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const addUser = async (u: User) => {
  try {
    const user = new User(u);
    return await user.save();
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const deleteFavourite = async (userId: ObjectId, contractId: string) => {
  try {
    return await User.findOneAndUpdate(
      { _id: userId },
      { $pull: { 'favourites.contracts': contractId } },
      { new: true }
    );
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const deleteNote = async (userId: ObjectId, noteId: string) => {
  try {
    return await User.findOneAndUpdate(
      { _id: userId },
      { $pull: { 'note.contracts': { contractId: noteId } } },
      { new: true }
    );
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const deleteMany = async (queryObject: object, permanent = false) => {
  if (permanent) {
    try {
      return (await User.deleteMany(queryObject)).deletedCount;
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

const deleteUser = async (userId: ObjectId) => {
  try {
    return await User.deleteOne(userId);
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const editUser = async (u: WithID<User>, unset: {} = {}) => {
  try {
    return await User.findOneAndUpdate(
      { _id: u._id },
      { $set: u, $unset: unset },
      {
        new: true
      }
    );
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getMany = async (query: object, fields: object) => {
  try {
    return await User.find(query, fields).populate('company');
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getUserById = async (id: ObjectId, fields?: object, options?: { company?: boolean }) => {
  const company = options?.company || false;
  try {
    if (company) {
      return await User.findById(id, fields).populate('company');
    }
    return await User.findById(id, fields);
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getUser = async (query: object, fields?: object, options?: { company?: boolean }) => {
  const company = options?.company || false;
  try {
    if (company) {
      return await User.findById(query, fields).populate('company');
    }
    return await User.findOne(query, fields);
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const updateMany = async (queryObject: object = {}, updateObject: object = {}) => {
  try {
    return (await User.updateMany(queryObject, updateObject)).modifiedCount;
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const updateOne = async (query: object, fields: object, options?: { company?: boolean }) => {
  const company = options?.company || false;
  try {
    if (company) {
      return await User.findOneAndUpdate(query, fields, { new: true }).populate('company');
    }
    return await User.findOneAndUpdate(query, fields, { new: true });
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

export default {
  addFavourite,
  addNote,
  addUser,
  deleteFavourite,
  deleteMany,
  deleteNote,
  deleteUser,
  editUser,
  getMany,
  getUser,
  getUserById,
  updateMany,
  updateOne
};
