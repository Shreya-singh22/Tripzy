import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/tokens';
import { AppError } from '../utils/errors';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  }

  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token); // throws AppError on failure
  req.userId = payload.userId;
  req.userRole = payload.role;
  return next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.userRole !== 'ADMIN') {
    return next(new AppError(403, 'FORBIDDEN', 'Admin access required'));
  }
  return next();
}
