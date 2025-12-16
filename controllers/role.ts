import { Request, Response } from 'express';
import { Logger } from '../util/logging';
import db from './db';

const logger = new Logger('Roles');

export const getRoles = async (req: Request, res: Response) => {
  const result = await db.role.getRoles();
  logger.initReq = req;
  if (!result) {
    logger.debugMessage('Could not return access roles - Access roles not found');
    return res.status(422).json({
      message: 'Could not return access roles - Access roles not found',
      code: 422
    });
  }

  logger.debugMessage('Access roles retrieved successfully');
  res.status(200).json({ message: 'Access roles retrieved successfully', data: result });
};

export default { getRoles };
