import { Request, Response } from 'express';

export const getPeriodical = (req: Request, res: Response) => {
  res.status(200).json([
    { value: 10, month: '2023-01-01T00:00:00.000Z' },
    { value: 100, month: '2023-08-01T00:00:00.000Z' }
  ]);
};

export default { getPeriodical };
