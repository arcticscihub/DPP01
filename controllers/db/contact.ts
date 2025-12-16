import { ObjectId } from 'bson';

import { Contact } from '../../models/';
import { Logger } from '../../util/logging';

const logger = new Logger('Contact');

const addContact = async (c: Contact) => {
  const contact = new Contact(c);
  return await contact.save();
};

const deleteContact = async (id: string | ObjectId) => {
  return await Contact.findOneAndUpdate({ _id: id }, { status: 'deleted' }, { new: true });
};

const deleteMany = async (queryObject: object, permanent = false) => {
  if (permanent) {
    try {
      return (await Contact.deleteMany(queryObject)).deletedCount;
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

const editContact = async (c: any) => {
  return await Contact.findOneAndUpdate({ _id: c._id }, c, { new: true });
};

const getContacts = async (fields: object) => {
  try {
    return await Contact.find(fields);
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getSingleContact = async (id: string) => {
  return await Contact.findById(id);
};

const updateMany = async (queryObject: object = {}, updateObject: object = {}) => {
  try {
    return (await Contact.updateMany(queryObject, updateObject)).modifiedCount;
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

export default {
  addContact,
  deleteContact,
  deleteMany,
  editContact,
  getContacts,
  getSingleContact
};
