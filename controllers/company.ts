import { Request, Response } from 'express';
import mongoose from 'mongoose';

import db from './db';
import { removeDuplicates } from './util';

import { User } from '../models/';
import { Company } from '../models/';

import { OnboardingState } from '../util/types';
import { Logger } from '../util/logging';
import { WithID } from '../util/types';
import { ZCompany } from '../validators/';

const logger = new Logger('Company');

export const addCompany = async (req: Request, res: Response) => {
  console.log('inactive for now', req);
};

export const addMyCompany = async (req: Request, res: Response) => {
  logger.initReq = req;
  const authenticated = req.user as WithID<User>;

  const validation = ZCompany.safeParse({
    ...req.body,
    status:
      req.body.status && req.body.status.length > 0 ? req.body.status.toLowerCase() : undefined,
    taxIdNumber:
      req.body.taxIdNumber && req.body.taxIdNumber.length > 0 ? req.body.taxIdNumber : undefined,
    country: req.body.country && req.body.country.length > 0 ? req.body.country : undefined,
    size: req.body.size && parseInt(req.body.size)
  });
  logger.initReq = req;
  if (validation.success === false) {
    logger.debugMessage(`Could not add company information - validation failed`);
    return res.status(422).json({
      message: `Could not add company information - validation failed`,
      code: 422,
      issues: validation.error.issues
    });
  }

  logger.debugMessage(
    `Validation success - Storing company ${
      validation.data.name ? `with name ${validation.data.name}` : `information`
    }`,
    req
  );

  const result = await db.company.addCompany(validation.data);

  if (!result) {
    logger.debugMessage(`Could not save company information to database`);
    return res.status(422).json({ message: 'Could not save Company information', code: 422 });
  }

  logger.debugMessage(`Company added successfully - Adding to user`);

  await User.findOneAndUpdate(
    { _id: authenticated._id, 'onboarding.state': OnboardingState.COMPANY },
    { company: result._id, 'onboarding.state': OnboardingState.LOCATION },
    { new: true }
  );

  res.status(201).json({ message: `Company added successfully`, code: 201, data: result });
};

export const editCompany = async (req: Request, res: Response) => {
  logger.initReq = req;
  if (!req.params.id) {
    logger.debugMessage('Could not update company - ID is missing');
    return res
      .status(422)
      .json({ message: 'Could not update company - ID is missing', code: 422 });
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    logger.debugMessage('Could not update company - invalid ID');
    return res.status(422).json({ message: 'Could not update company - invalid ID', code: 422 });
  }

  const validated = ZCompany.safeParse(req.body);

  if (validated.success === false) {
    logger.debugMessage(`Could not update company information - validation failed`);
    return res.status(422).json({
      message: `Could not update company information - validation failed`,
      code: 422,
      issues: validated.error.issues
    });
  }

  logger.debugMessage(
    `Validation success - Updating company ${
      validated.data.name ? `with name ${validated.data.name}` : `information`
    }`,
    req
  );

  const result = await Company.findOneAndUpdate({ _id: req.params.id }, validated.data, {
    new: true
  });

  if (!result) {
    logger.debugMessage(`Could not update company information to database`);
    return res.status(422).json({ message: 'Could not update company information', code: 422 });
  }

  logger.debugMessage(`Company updated successfully`);
  res.status(205).json({ message: 'Company updated successfully', code: 205 });
};

export const editMyCompany = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  const company = await Company.findById(authenticated.company);
  logger.initReq = req;
  if (!company) {
    logger.debugMessage(`Could not update company information - no company found`);
    return res
      .status(422)
      .json({ message: `Could not update company information - no company found`, code: 422 });
  }

  const validation = ZCompany.safeParse({
    ...company.toObject(),
    ...req.body,
    ...(req.body.country === null && { country: undefined })
  });

  if (validation.success === false) {
    logger.debugMessage(`Could not update company information - validation failed`);
    return res.status(422).json({
      message: `Could not update company information - validation failed`,
      code: 422,
      issues: validation.error.issues
    });
  }

  logger.debugMessage(
    `Validation success - Updating company ${
      validation.data.name ? `with name ${validation.data.name}` : `information`
    }`,
    req
  );
  const result = await Company.findOneAndUpdate({ _id: authenticated.company }, validation.data, {
    new: true
  });

  if (!result) {
    logger.debugMessage(`Could not update company information to database`);
    return res.status(422).json({ message: 'Could not update company information', code: 422 });
  }

  logger.debugMessage(`Company updated successfully`);
  res.status(205).json({ message: 'Company updated successfully', code: 205 });
};

export const getCompany = async (req: Request, res: Response) => {
  if (!req.params.id) {
    const result = await db.company.getCompanies();
    return res
      .status(200)
      .json({ message: 'Companies retrieved successfully', code: 200, data: result });
  }
  logger.initReq = req;
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    logger.debugMessage('Could not retrieve company - invalid ID');
    return res.status(422).json({ message: 'Could not retrieve company - invalid ID', code: 422 });
  }

  const result = await db.company.getCompany(new mongoose.Types.ObjectId(req.params.id));
  res.status(200).json({ message: 'Company retrieved successfully', code: 200, data: result });
};

export const getMyCompany = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  const result = await User.findById(authenticated._id).populate('company');

  if (!result) {
    logger.debugMessage('Could not return company detailes - User not found');
    return res
      .status(422)
      .json({ message: 'Could not return company detailes - User not found', code: 422 });
  }

  logger.debugMessage('Returning company details');
  res.status(200).json(result.company);
};

export const getDepartments = async (req: Request, res: Response) => {
  const authenticated = req.user as WithID<User>;
  const result = (
    await db.user.getMany(
      { company: authenticated.company },
      { department: 1, company: 0, _id: 0 }
    )
  )
    ?.filter(row => row.department)
    .map(row => row.department) as string[];
  logger.initReq = req;
  if (!result) {
    logger.debugMessage('Could not fetch agreement types');
    return res.status(422).json({ message: 'Could not fetch agreement types', code: 422 });
  }

  const departments = removeDuplicates(result);

  if (!result) {
    logger.debugMessage('Could not return company departments - Company not found');
    return res
      .status(422)
      .json({ message: 'Could not return company departments - Company not found', code: 422 });
  }
  logger.debugMessage('Company departments retrieved successfully');
  res.status(200).json({
    message: 'Company departments retrieved successfully',
    code: 200,
    data: departments
  });
};

export default {
  addCompany,
  addMyCompany,
  editCompany,
  editMyCompany,
  getCompany,
  getMyCompany,
  getDepartments
};
