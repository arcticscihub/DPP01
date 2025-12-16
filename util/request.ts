import { Response, Request, NextFunction } from 'express';
import { VAR_FRONTEND_BASE_URL } from './variables';

import { User } from '../models';
import { States } from './types';

export const CORSConfiguration = {
  origin: VAR_FRONTEND_BASE_URL.endsWith('/')
    ? VAR_FRONTEND_BASE_URL.slice(0, -1)
    : VAR_FRONTEND_BASE_URL,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH', 'PUT'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'api-version',
    'rid',
    'content-type'
  ],
  credentials: true
};

export const verifyAuthStatus = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    const user = req.user as User;
    if (user.status === States.ACTIVE) {
      next();
    } else {
      res.status(401).send();
    }
  } else {
    res.status(401).send();
  }
};

export const arcticsciencehubFormConvertion = (req: Request, res: Response, next: NextFunction) => {
  const { formFields } = req.body;
  if (formFields) {
    formFields.find((item: { id: string }) => item.id === 'email') &&
      (req.body.email = formFields
        .find((item: { id: string }) => item.id === 'email')
        .value.toLowerCase());

    formFields.find((item: { id: string }) => item.id === 'firstName') &&
      (req.body.firstName = formFields.find(
        (item: { id: string }) => item.id === 'firstName'
      ).value);

    formFields.find((item: { id: string }) => item.id === 'lastName') &&
      (req.body.lastName = formFields.find(
        (item: { id: string }) => item.id === 'lastName'
      ).value);

    formFields.find((item: { id: string }) => item.id === 'password') &&
      (req.body.password = formFields.find(
        (item: { id: string }) => item.id === 'password'
      ).value);
  }
  delete req.body.formFields;
  next();
};

export const arcticsciencehubLoginConvertion = (req: Request, res: Response, next: NextFunction) => {
  const { formFields } = req.body;
  if (formFields) {
    req.body.username = formFields
      .find((item: { id: string }) => item.id === 'email')
      .value.toLowerCase();
    req.body.password = formFields.find((item: { id: string }) => item.id === 'password').value;
  }
  delete req.body.formFields;
  next();
};

export default { arcticsciencehubFormConvertion, arcticsciencehubLoginConvertion };
