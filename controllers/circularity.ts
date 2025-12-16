import { Request, Response } from 'express';
import { Logger } from '../util/logging';
import db from './db';

const logger = new Logger('Circularity');

export const getCircularities = async (req: Request, res: Response) => {
  const result = await db.circularity.getCircularityMetrics();
  logger.initReq = req;
  if (!result) {
    logger.debugMessage('Could not return circularity metrics - Circularities not found');
    return res.status(422).json({
      message: 'Could not return circularity metrics - Circularities not found',
      code: 422
    });
  }

  logger.debugMessage('Returning circularity metrics');
  res.status(200).json(result);
};

export default { getCircularities };
