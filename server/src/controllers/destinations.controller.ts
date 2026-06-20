import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/destinations.service';

export async function getAll(_req: Request, res: Response, next: NextFunction) {
  try {
    return res.json(await svc.getAllDestinations());
  } catch (err) {
    return next(err);
  }
}

export async function getBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    return res.json(await svc.getDestinationBySlug(req.params.slug));
  } catch (err) {
    return next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const dest = await svc.createDestination(req.body);
    return res.status(201).json(dest);
  } catch (err) {
    return next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const dest = await svc.updateDestination(req.params.id, req.body);
    return res.json(dest);
  } catch (err) {
    return next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteDestination(req.params.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}
