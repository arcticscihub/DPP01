import { ObjectId } from 'bson';
import { Request, Response } from 'express';
import mongoose from 'mongoose';

import { capitalizeLetters } from './util';

import db from '../db';
import util, { createUpdateObject } from '../util';

import { User } from '../../models/';
import { Logger } from '../../util/logging';
import { WithID } from '../../util/types';
import { VAR_SEARCH_STRING_LENGTH } from '../../util/variables';
import { ZSupplier } from '../../validators/';

const logger = new Logger('Supplier');

export const addSupplier = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;
  let storedContacts: ObjectId[] = [];

  req.body.contact &&
    (storedContacts = await util.supplier.handleContactPersons(
      req.body.contact,
      authenticated.company
    ));

  const validation = ZSupplier.safeParse({ ...req.body, contact: storedContacts });

  if (validation.success === false) {
    logger.debugMessage('Could not add supplier - Validation failed', req);
    return res
      .status(422)
      .json({ message: 'Could not add supplier', code: 422, issues: validation.error.issues });
  }

  logger.debugMessage(
    `Validation success - Storing supplier ${
      validation.data.name ? `with name ${validation.data.name}` : `information`
    }`,
    req
  );
  const parsed = capitalizeLetters(validation.data);
  const result = await db.supplier.addSupplier({
    ...parsed,
    contact: storedContacts,
    company: authenticated.company
  });

  if (!result) {
    logger.debugMessage('Could not add supplier - Could not save to the database', req);
    return res
      .status(422)
      .json({ message: 'Could not add supplier - Could not save to the database', code: 422 });
  }

  logger.debugMessage('Supplier added successfully!', req);
  res.status(201).json({ message: 'Supplier added successfully!', code: 201, data: result });
};

export const deleteSupplier = async (req: Request, res: Response) => {
  logger.initReq = req;
  if (!req.query.id) {
    logger.debugMessage('Could not delete supplier - ID is missing', req);
    return res
      .status(422)
      .json({ message: 'Could not delete supplier - ID is missing', code: 422 });
  }

  if (typeof req.query.id === 'string' && mongoose.Types.ObjectId.isValid(req.query.id)) {
    const activeContracts = await db.contract.getAggregated('$suppliers', {
      'suppliers.supplier': new mongoose.Types.ObjectId(req.query.id)
    });
    if (activeContracts && activeContracts.length > 0) {
      logger.debugMessage(
        `Could not delete supplier - Supplier is registered to ${activeContracts.length} contracts`,
        req
      );
      return res.status(422).json({
        message: `Could not delete supplier - Supplier is registered to ${activeContracts.length} contracts`,
        code: 422
      });
    }
    await db.supplier.deleteSupplier(req.query.id);
    logger.debugMessage('Supplier deleted successfully', req);
    return res.status(205).json({ message: 'Supplier deleted successfully', code: 205 });
  }

  logger.debugMessage(`Could not delete supplier - ${req.query.id} is not a valid ID`, req);
  res
    .status(422)
    .json({ message: `Could not delete supplier - ${req.query.id} is not a valid ID`, code: 422 });
};

export const editSupplier = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;

  if (!req.body._id) {
    logger.debugMessage('Could not update supplier - ID is missing', req);
    return res
      .status(422)
      .json({ message: 'Could not update supplier - ID is missing', code: 422 });
  }

  const supplier = await db.supplier.getSingleSupplier(req.body._id);

  if (!supplier) {
    logger.debugMessage('Could not update supplier - excisting supplier not found', req);
    return res
      .status(422)
      .json({ message: 'Could not update supplier - excisting supplier not found', code: 422 });
  }

  let storedContacts: ObjectId[] = [];
  if (req.body.contact) {
    for (const contact in supplier.contact) {
      await db.contact.deleteContact(supplier.contact[contact]);
    }

    storedContacts = await util.supplier.handleContactPersons(
      req.body.contact,
      authenticated.company
    );
  }

  const validation = ZSupplier.safeParse({ ...req.body, contact: storedContacts });

  if (validation.success === false) {
    logger.debugMessage('Could not update supplier - validation failed', req);
    return res.status(422).json({
      message: 'Could not update supplier - validation failed',
      code: 422,
      issues: validation.error.issues
    });
  }

  logger.debugMessage('Validation success - Storing supplier information', req);

  const parsed = capitalizeLetters(validation.data);
  const updatedSupplier = {
    _id: req.body._id,
    ...parsed,
    company: authenticated.company,
    contact: storedContacts
  };

  const unsets = createUpdateObject(supplier.toObject(), updatedSupplier);

  const result = await db.supplier.editSupplier(updatedSupplier, unsets);

  if (!result) {
    logger.debugMessage('Could not update supplier - Could not save to the database', req);
    return res
      .status(422)
      .json({ message: 'Could not update supplier - Could not save to the database', code: 422 });
  }

  logger.debugMessage('Supplier updated successfully!', req);
  res.status(205).json({ message: 'Supplier updated successfully!', code: 205, data: result });
};

export const getSearchResult = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;

  if (!req.query && !req.body.query) {
    logger.debugMessage('Could not fetch suppliers - Query string missing', req);
    return res.status(200).json({
      message: 'Could not fetch suppliers - Query string missing',
      code: 200,
      data: []
    });
  }

  const search = req.body.query || req.query.query || '';

  if (search.length < VAR_SEARCH_STRING_LENGTH) {
    logger.debugMessage('Could not fetch suppliers - Query string too short', req);
    return res
      .status(422)
      .json({ message: 'Could not fetch suppliers - Query string too short', code: 422 });
  }

  const result = await db.supplier.searchSuppliers(search, authenticated.company);
  logger.debugMessage(`Fetching suppliers succeeded`, req);
  res.status(200).json({ message: 'Fetching suppliers succeeded', code: 200, data: result });
};

export const getSuppliers = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;

  if (!req.query.id) {
    const query: { company?: ObjectId; status?: string } = { company: authenticated.company };
    req.query.status && (query.status = req.query.status as string);
    const result = await db.supplier.getSuppliers(query);

    if (!result) {
      logger.debugMessage(`Getting supplier failed`, req);
      return res.status(422).json({ message: `Getting supplier failed`, code: 422 });
    }

    logger.debugMessage(`Supplier received successfully!`, req);
    return res.status(200).json(result);
  }

  if (typeof req.query.id === 'string' && mongoose.Types.ObjectId.isValid(req.query.id)) {
    const result = await db.supplier.getSingleSupplier(req.query.id);

    if (!result) {
      logger.debugMessage(`Getting supplier failed - ID ${req.query.id} not found`, req);
      return res.status(404).json({
        message: `Getting supplier failed - ID ${req.query.id} not found`,
        code: 404
      });
    }

    logger.debugMessage(`Supplier with ID ${req.query.id} found!`, req);
    return res.status(200).json(result);
  }

  logger.debugMessage(`Getting supplier failed - ${req.query.id} is not a valid ID`, req);
  res
    .status(422)
    .json({ message: `Getting supplier failed - ${req.query.id} is not a valid ID`, code: 422 });
};

export default {
  addSupplier,
  deleteSupplier,
  editSupplier,
  getSearchResult,
  getSuppliers
};
