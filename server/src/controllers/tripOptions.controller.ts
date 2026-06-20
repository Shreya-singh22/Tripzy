import { Request, Response, NextFunction } from 'express';
import { getAllTripOptions } from '../services/tripOptions.service';

export async function getAll(_req: Request, res: Response, next: NextFunction) {
  try {
    return res.json(await getAllTripOptions());
  } catch (err) {
    return next(err);
  }
}
