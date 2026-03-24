import { Request, Response } from 'express';
import mongoose from 'mongoose';

import { capitalizeLetters } from './util';

import db from '../db';

import { User } from '../../models/';
import { Logger } from '../../util/logging';
import { WithID } from '../../util/types';
import { ZContact } from '../../validators/';

const logger = new Logger('Contact');

export const addContact = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  const validated = ZContact.safeParse({
    ...req.body,
    phone:
      req.body.phone && typeof req.body.phone === 'string' ? Number(req.body.phone) : undefined
  });
  logger.initReq = req;
  if (validated.success === false) {
    logger.debugMessage(`Could not add contact - validation failed`);
    return res.status(422).json({
      message: `Could not add contact - validation failed`,
      code: 422,
      issues: validated.error.issues
    });
  }

  logger.debugMessage(`Validation success - Storing contact information`);
  const parsed = capitalizeLetters(validated.data);
  const result = await db.contact.addContact({
    // ...validated.data,
    ...parsed,
    company: authenticated.company
  });
  result
    ? logger.debugMessage(`Contact added successfully`)
    : logger.debugMessage(`Could not save contact to database`);
  res.status(result ? 201 : 422).json({
    message: result ? `Contact added successfully` : 'Could not save contact',
    code: result ? 201 : 422,
    data: result ? result : undefined
  });
};

export const deleteContact = async (req: Request, res: Response) => {
  logger.initReq = req;
  if (!req.query.id) {
    logger.debugMessage(`Could not delete contact - no ID provided`);
    return res
      .status(422)
      .json({ message: `Could not delete contact - no ID provided`, code: 422 });
  }

  if (typeof req.query.id === 'string' && mongoose.Types.ObjectId.isValid(req.query.id)) {
    logger.debugMessage(`Deleting contact person with ID ${req.query.id}`);
    const result = await db.contact.deleteContact(req.query.id);
    result
      ? logger.debugMessage(`Contact with ID ${req.query.id} deleted successfully`)
      : logger.debugMessage(`Could not delete contact - ID ${req.query.id} not found`);
    return res.status(result ? 205 : 404).json({
      message: result
        ? 'Contact deleted successfully'
        : 'Could not delete contact - No contact found',
      code: result ? 205 : 404
    });
  }

  logger.debugMessage(`Could not delete contact - ${req.query.id} is not a valid ID`);
  res.status(422).json({
    message: `Could not delete contact - ${req.query.id} is not a valid ID`,
    code: 422
  });
};

export const editContact = async (req: Request, res: Response) => {
  logger.initReq = req;
  if (!req.body._id) {
    logger.debugMessage(`Could not update contact - no ID provided`);
    return res.status(422).json({
      message: `Could not update contact - no ID provided`,
      code: 422
    });
  }

  logger.debugMessage(`Updating contact with ID ${req.body._id}`);

  const result = await db.contact.editContact(req.body);

  if (!result) {
    logger.debugMessage(`Could not update contact - ID ${req.body._id} not found`);
    return res.status(422).json({
      message: `Could not update contact - ID ${req.body._id} not found`,
      code: 422
    });
  }

  logger.debugMessage(`Updating contact with ID ${req.body._id} succeeded!`);
  res.status(205).json({ message: `Updating contact succeeded!`, code: 205, data: result });
};

export const getContact = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;
  if (!req.query.id) {
    logger.debugMessage(`No ID specified, fetching all contacts`);
    const result = await db.contact.getContacts({ company: authenticated.company });
    return res
      .status(200)
      .json({ message: 'Fetching contacts succeeded', code: 200, data: result });
  }

  if (typeof req.query.id === 'string' && mongoose.Types.ObjectId.isValid(req.query.id)) {
    logger.debugMessage(`Fetching contact with ID ${req.query.id}`);
    const result = await db.contact.getSingleContact(req.query.id);
    result
      ? logger.debugMessage(`Fetching contact with ID ${req.query.id} succeeded`)
      : logger.debugMessage(`Could not fetch contact - ID ${req.query.id} not found`);
    return res.status(result ? 200 : 404).json({
      message: result
        ? 'Fetching contact succeeded'
        : `Could not fetch contact - No contact found with ID ${req.query.id}`,
      code: result ? 200 : 404,
      data: result
    });
  }

  logger.debugMessage(`Could not fetch contact - ${req.query.id} is not a valid ID`);
  res.status(422).json({
    message: `Could not fetch contact - ${req.query.id} is not a valid ID`,
    code: 422
  });
};

export default { addContact, deleteContact, editContact, getContact };
