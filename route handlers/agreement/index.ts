import { ObjectId } from 'bson';
import { Request, Response } from 'express';
import mongoose from 'mongoose';

import attachmentController from './attachment';
import { capitalizeLetters } from './util';

import db from '../db';
import util, { createUpdateObject, combineAndSortArrays, removeDuplicates } from '../util';

import { IContractScope, IAttachment, User } from '../../models/';
import { Logger } from '../../util/logging';
import { WithID } from '../../util/types';
import { VAR_SEARCH_STRING_LENGTH } from '../../util/variables';
import { ZContract, ZContractFavourite, ZContractNote } from '../../validators/';
import { deleteFileFromS3 } from '../util/document';

const logger = new Logger('Contract');

export const addContract = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  const suppliers = await util.contract.handleSuppliers(req.body.suppliers, authenticated.company);
  logger.initReq = req;
  if (req.body.valid) {
    req.body.valid.fromDate && (req.body.valid.fromDate = new Date(req.body.valid.fromDate));
    req.body.valid.toDate && (req.body.valid.toDate = new Date(req.body.valid.toDate));
  }

  const validated = ZContract.safeParse({ ...req.body, suppliers: suppliers });

  if (validated.success === false) {
    logger.debugMessage(`Could not add contract - validation failed`);
    return res.status(422).json({
      message: `Could not add contract - validation failed`,
      code: 422,
      issues: validated.error.issues
    });
  }
  let files: IAttachment[] = req.body.files;
  if (files != undefined) {
    for (const file of files) {
      logger.debugMessage('Uploading document');
      const fileName: string = String(file.name);
      const fileData: string = String(file.data);
      const path: string = await util.contract.uploadFileToBucket(fileName, fileData);
      file.fullPath = path;
      file.data = undefined;
      logger.debugMessage('Uploading document complete');
    }
  }

  logger.debugMessage(
    `Validation success - Storing contract ${
      validated.data.name ? `with title ${validated.data.name}` : `information`
    }`,
    req
  );

  const parsed = capitalizeLetters(validated.data);
  const result = await db.contract.addContract({
    ...parsed,
    suppliers,
    files,
    company: authenticated.company
  });

  result
    ? logger.debugMessage(
        `Contract ${result.name ? `with title ${result.name}` : 'information'} added successfully`,
        req
      )
    : logger.debugMessage(`Could not add contract - Could not save to the database`);
  res.status(result ? 201 : 422).json({
    message: result
      ? `Contract ${result.name ? `with title ${result.name}` : 'information'} added successfully`
      : 'Could not add contract - Could not save to the database',
    code: result ? 201 : 422,
    data: result ? result : undefined
  });
};

export const addFavourite = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  const validation = ZContractFavourite.safeParse(req.body);
  logger.initReq = req;

  if (validation.success === false) {
    logger.debugMessage(`Could not add favourite - no contract ID provided`);
    return res.status(422).json({
      message: `Could not add favourite - no contract ID provided`,
      code: 422,
      issues: validation.error.issues
    });
  }

  if (
    typeof validation.data.contractId === 'string' &&
    mongoose.Types.ObjectId.isValid(validation.data.contractId)
  ) {
    logger.debugMessage(`Adding favourite for contract ID ${req.query.id}`);
    const result = await db.user.addFavourite(authenticated._id, validation.data.contractId);
    logger.debugMessage(`Favourite for contract with ID ${req.query.id} added successfully`);
    return res.status(205).json({
      message: 'Favourite added successfully',
      code: 205,
      data: result?.favourites?.contracts
    });
  }

  logger.debugMessage(`Could not add favourite - ${req.query.id} is not a valid ID`);
  res
    .status(422)
    .json({ message: `Could not add favourite - ${req.query.id} is not a valid ID`, code: 422 });
};

export const addNote = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  const validation = ZContractNote.safeParse(req.body);
  logger.initReq = req;

  if (validation.success === false) {
    logger.debugMessage(`Could not add new note - no contract ID provided`);
    return res.status(422).json({
      message: `Could not add new note - no contract ID provided`,
      code: 422,
      issues: validation.error.issues
    });
  }

  if (
    typeof validation.data.contractId === 'string' &&
    mongoose.Types.ObjectId.isValid(validation.data.contractId)
  ) {
    logger.debugMessage(`Adding note for contract ID ${req.query.id}`);
    const result = await db.user.addNote(authenticated._id, validation.data);
    result
      ? logger.debugMessage(`Note for contract with ID ${req.query.id} added successfully`)
      : logger.debugMessage(`Could not save note to database`);
    return res.status(result ? 205 : 422).json({
      message: result ? `Note added successfully` : 'Could not save note to database',
      code: result ? 205 : 422,
      data: result ? result?.notes?.contracts : undefined
    });
  }

  logger.debugMessage(`Could not add new note - ${req.query.id} is not a valid ID`);
  res
    .status(422)
    .json({ message: `Could not add new note - ${req.query.id} is not a valid ID`, code: 422 });
};

export const deleteContract = async (req: Request, res: Response) => {
  logger.initReq = req;
  if (!req.query.id) {
    logger.debugMessage(`Could not delete contract - no contract ID provided`);
    return res
      .status(422)
      .json({ message: 'Could not delete contract - no contract ID provided', code: 422 });
  }

  if (typeof req.query.id === 'string' && mongoose.Types.ObjectId.isValid(req.query.id)) {
    logger.debugMessage(`Deleting contract with ID ${req.query.id}`);
    const result = await db.contract.deleteContract(req.query.id);
    result
      ? logger.debugMessage(`Contract with ID ${req.query.id} deleted successfully`)
      : logger.debugMessage(`Could not delete contract with ID ${req.query.id}`);
    return res.status(result ? 205 : 422).json({
      message: result ? 'Contract deleted successfully' : 'Could not delete contract',
      code: result ? 205 : 200
    });
  }

  logger.debugMessage(`Could not delete contract - ${req.query.id} is not a valid ID`);
  res
    .status(422)
    .json({ message: `Could not delete contract - ${req.query.id} is not a valid ID`, code: 422 });
};

export const deleteFavourite = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;

  if (!req.query.id) {
    logger.debugMessage(`Could not delete favourite - no contract ID provided`);
    return res
      .status(422)
      .json({ message: `Could not delete favourite - no contract ID provided`, code: 422 });
  }

  if (typeof req.query.id === 'string' && mongoose.Types.ObjectId.isValid(req.query.id)) {
    logger.debugMessage(`Deleting favourite for contract with ID ${req.query.id}`);
    const result = await db.user.deleteFavourite(authenticated._id, req.query.id);
    logger.debugMessage(`Favourite for contract with ID ${req.query.id} deleted successfully`);
    return res.status(205).json({
      message: 'Favourite deleted successfully',
      code: 205,
      data: result?.favourites?.contracts
    });
  }

  logger.debugMessage(`Could not delete favourite - ${req.query.id} is not a valid ID`);
  res.status(422).json({
    message: `Could not delete favourite - ${req.query.id} is not a valid ID`,
    code: 422
  });
};

export const deleteNote = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;

  if (!req.query.id) {
    logger.debugMessage(`Could not delete note - no contract ID provided`);
    return res
      .status(422)
      .json({ message: `Could not delete note - no contract ID provided`, code: 422 });
  }

  if (typeof req.query.id === 'string' && mongoose.Types.ObjectId.isValid(req.query.id)) {
    logger.debugMessage(`Deleting note for contract with ID ${req.query.id}`);
    const result = await db.user.deleteNote(authenticated._id, req.query.id);
    logger.debugMessage(`Note for contract with ID ${req.query.id} deleted successfully`);
    return res
      .status(205)
      .json({ message: 'Note deleted successfully', code: 205, data: result?.notes?.contracts });
  }

  logger.debugMessage(`Could not delete note - ${req.query.id} is not a valid ID`);
  res
    .status(422)
    .json({ message: `Could not delete note - ${req.query.id} is not a valid ID`, code: 422 });
};

export const editContract = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;

  if (!req.body._id) {
    logger.debugMessage(`Could not update contract - no ID provided in the request body`);
    return res.status(422).json({
      message: 'Could not update contract - no ID provided in the request body',
      code: 422
    });
  }

  const contract = await db.contract.getSingleContract(req.body._id);
  if (!contract) {
    logger.debugMessage('Could not update contract - excisting contract not found');
    return res
      .status(422)
      .json({ message: 'Could not update contract - excisting contract not found', code: 422 });
  }

  const suppliers = await util.contract.handleSuppliers(req.body.suppliers, authenticated.company);

  if (req.body.valid) {
    req.body.valid.fromDate && (req.body.valid.fromDate = new Date(req.body.valid.fromDate));
    req.body.valid.toDate && (req.body.valid.toDate = new Date(req.body.valid.toDate));
  }

  const validated = ZContract.safeParse(req.body);

  if (validated.success === false) {
    logger.debugMessage(`Could not edit contract - validation failed`);
    return res.status(422).json({
      message: `Could not edit contract - validation failed`,
      code: 422,
      issues: validated.error.issues
    });
  }
  const managers = util.contract.handleManagers(validated.data.managers);

  logger.debugMessage(`Validation success - Updating contract with ID ${req.body._id}`);

  let files: WithID<IAttachment>[] = req.body.files;
  if (contract.files !== undefined) {
    for (const file in contract.files) {
      const stillThere = files.some(
        obj =>
          contract.files !== undefined &&
          new mongoose.Types.ObjectId(obj._id).equals(contract.files[file]._id as ObjectId)
      );
      if (!stillThere) {
        logger.debugMessage(
          `File ${contract.files[file].name} is no longer present, deleting from S3`
        );
        await deleteFileFromS3(contract.files[file].fullPath);
        logger.debugMessage(`${contract.files[file].name} was successfully deleted from S3`);
      }
    }
  }

  if (files != undefined) {
    for (const file in files) {
      const alreadyThere = contract.files?.some(
        obj =>
          files !== undefined &&
          (obj._id as ObjectId).equals(new mongoose.Types.ObjectId(files[file]._id))
      );
      if (!alreadyThere) {
        const fileName: string = String(files[file].name);
        const fileData: string = String(files[file].data);
        logger.debugMessage(`Uploading document ${fileName} to S3`);
        const path: string = await util.contract.uploadFileToBucket(fileName, fileData);
        files[file].fullPath = path;
        delete files[file].data;
        logger.debugMessage(`Successfully uploaded ${fileName} to S3`);
      }
    }
  }

  const parsed = capitalizeLetters(validated.data);

  const updatedContract = {
    _id: req.body._id,
    ...parsed,
    company: authenticated.company,
    files,
    suppliers,
    managers,
    alternativeContracts: validated.data.alternativeContracts
      .filter(string => mongoose.Types.ObjectId.isValid(string))
      .map(string => new mongoose.Types.ObjectId(string))
  };

  const unsets = createUpdateObject(contract.toObject(), updatedContract);

  const result = await db.contract.editContract(updatedContract, unsets);

  if (!result) {
    logger.debugMessage(`Could not update contract - No contract with ID ${req.body._id} found`);
    return res.status(422).json({
      message: `Could not update contract - No contract with ID ${req.body._id} found`,
      code: 422
    });
  }

  logger.debugMessage(`Updating contract with ID ${req.body._id} succeeded!`);
  res.status(205).json({ message: 'Updating contract succeeded', code: 205, data: '' });
};

export const getAgreementTypes = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  logger.initReq = req;
  logger.debugMessage('Looking up agreement types');

  const result = (
    await db.contract.getMany({ company: authenticated.company }, { _id: 0, type: 1 })
  )
    ?.filter(row => row.type)
    .map(row => row.type) as string[];

  if (!result) {
    logger.debugMessage('Could not fetch agreement types');
    return res.status(422).json({ message: 'Could not fetch agreement types', code: 422 });
  }

  const agreementTypes = removeDuplicates(result);

  logger.debugMessage('Agreement types fetched successfully');
  res
    .status(200)
    .json({ message: 'Agreement types fetched successfully', code: 200, data: agreementTypes });
};

export const getBonuses = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  const bonusesArray = [];
  logger.initReq = req;

  logger.debugMessage(`Fetching bonuses from all registered contracts`);
  const result = await db.contract.getMany(
    { company: authenticated.company },
    { _id: 0, bonuses: 1 }
  );

  if (!result) {
    logger.errorMessage('Fetching bonuses from database failed');
    return res.status(422).json({ message: 'Fetching bonuses from database failed', code: 422 });
  }

  for (const row in result) {
    if (typeof result[row].bonuses) {
      bonusesArray.push(result[row].bonuses);
    }
  }

  logger.debugMessage(`Combining and sorting bonuses`);
  const bonuses = combineAndSortArrays(bonusesArray);

  logger.debugMessage(`Bonuses retrieved successfully`);
  res.status(200).json({
    message: 'Bonuses retrieved successfully',
    code: 200,
    data: { bonuses }
  });
};

export const getContract = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  let result;
  logger.initReq = req;
  if (!req.query.id) {
    logger.debugMessage(`No ID specified, fetching all contracts`);
    logger.debugMessage(`No ID specified, fetching all contracts`);
    result = await db.contract.getContracts({ company: authenticated.company });
    for (const contract in result) {
      result[contract].suppliers
        .filter(supplier => supplier.supplier !== undefined && supplier.supplier !== null)
        .sort((a: any, b: any) =>
          a.supplier.name.toLowerCase().localeCompare(b.supplier.name.toLowerCase())
        )
        .concat(
          result[contract].suppliers.filter(
            supplier => supplier.supplier === undefined || supplier.supplier === null
          )
        );
    }
    return res
      .status(200)
      .json({ message: 'Fetching contracts succeeded', code: 200, data: result });
  }

  if (typeof req.query.id === 'string' && mongoose.Types.ObjectId.isValid(req.query.id)) {
    logger.debugMessage(`Fetching contract with ID ${req.query.id}`);
    result = await db.contract.getSingleContract(req.query.id);
    if (result) {
      result.suppliers
        .filter(supplier => supplier.supplier !== undefined && supplier.supplier !== null)
        .sort((a: any, b: any) =>
          a.supplier.name.toLowerCase().localeCompare(b.supplier.name.toLowerCase())
        )
        .concat(
          result.suppliers.filter(
            supplier => supplier.supplier === undefined || supplier.supplier === null
          )
        );
    }
    result && result.suppliers;
    result
      ? logger.debugMessage(`Found contract ${result.name} with ID ${req.query.id}`)
      : logger.debugMessage(
          `Could not fetch contract - No contract found with ID ${req.query.id}`
        );
    return res.status(result ? 200 : 404).json({
      message: result
        ? 'Fetching contract succeeded'
        : 'Could not fetch contract - No contract found',
      code: result ? 200 : 404,
      data: result
    });
  }

  logger.debugMessage(`Could not fetch contract - ${req.query.id} is not a valid ID`);
  res
    .status(422)
    .json({ message: `Could not fetch contract - ${req.query.id} is not a valid ID`, code: 422 });
};

export const getDepartments = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  const departmentsArray = [];
  logger.initReq = req;
  logger.debugMessage(`Fetching departments from all registered contracts`);
  const result =
    (await db.contract.getMany({ company: authenticated.company }, { _id: 0, department: 1 })) ||
    [];

  for (const row in result) {
    if (typeof result[row].department) {
      departmentsArray.push(result[row].department);
    }
  }

  logger.debugMessage(`Combining and sorting departments`);
  const departments = combineAndSortArrays(departmentsArray);

  logger.debugMessage(`Departments retrieved successfully`);
  res.status(200).json({
    message: 'Departments retrieved successfully',
    code: 200,
    data: { departments }
  });
};

export const getScopes = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  const mainCategoryArray = [],
    subCategoryArray = [],
    productArray = [];
  logger.initReq = req;

  logger.debugMessage(`Fetching scopes from all registered contracts`);
  const result =
    (await db.contract.getMany({ company: authenticated.company }, { _id: 0, scope: 1 })) || [];

  for (const row in result) {
    if (typeof result[row].scope) {
      const contractScopes = result[row].scope as IContractScope;
      contractScopes.mainCategory && mainCategoryArray.push(contractScopes.mainCategory);
      contractScopes.subCategory && subCategoryArray.push(contractScopes.subCategory);
      contractScopes.product && productArray.push(contractScopes.product);
    }
  }

  logger.debugMessage(`Combining and sorting scopes`);
  const mainCategory = combineAndSortArrays(mainCategoryArray);
  const subCategory = combineAndSortArrays(subCategoryArray);
  const product = combineAndSortArrays(productArray);

  res.status(200).json({
    message: 'Fetching scopes succeeded',
    code: 200,
    data: { mainCategory, subCategory, product }
  });
};

export const getSearchResult = async (req: Request, res: Response) => {
  logger.initReq = req;
  const authenticated = req.user as WithID<User>;
  if (!req.query && !req.body.query) {
    logger.debugMessage('Could not fetch contracts - Query string missing');
    return res.status(200).json({
      message: 'Could not fetch contracts - Query string missing',
      code: 200,
      data: []
    });
  }

  const search = req.body.query || req.query.query || '';

  if (search.length < VAR_SEARCH_STRING_LENGTH) {
    logger.debugMessage('Could not fetch contracts - Query string too short');
    return res
      .status(422)
      .json({ message: 'Could not fetch contracts - Query string too short', code: 422 });
  }

  const result = (await db.contract.searchContracts(search, authenticated.company)) || [];
  logger.debugMessage(`Fetching contracts succeeded`);
  res.status(200).json({ message: 'Fetching contracts succeeded', code: 200, data: result });
};

export default {
  ...attachmentController,
  addContract,
  addFavourite,
  addNote,
  deleteContract,
  deleteFavourite,
  deleteNote,
  editContract,
  getAgreementTypes,
  getBonuses,
  getContract,
  getDepartments,
  getScopes,
  getSearchResult
};
