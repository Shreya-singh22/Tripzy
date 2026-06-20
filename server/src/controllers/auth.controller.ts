import { Request, Response, NextFunction, CookieOptions } from 'express';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validation/auth.schema';
import * as authService from '../services/auth.service';
import { verifyRefreshToken } from '../utils/tokens';
import { AppError } from '../utils/errors';
import { prisma } from '../db/prisma';

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  };
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, refreshCookieOptions());
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = registerSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await authService.register(data);
    setRefreshCookie(res, refreshToken);
    return res.status(201).json({ user, accessToken });
  } catch (err) {
    return next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await authService.login(data);
    setRefreshCookie(res, refreshToken);
    return res.json({ user, accessToken });
  } catch (err) {
    return next(err);
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie('refreshToken', { path: '/api/auth' });
  return res.status(204).send();
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) throw new AppError(401, 'UNAUTHORIZED', 'No refresh token');

    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true },
    });
    if (!user) throw new AppError(401, 'UNAUTHORIZED', 'User not found');

    const { generateAccessToken } = await import('../utils/tokens');
    const accessToken = generateAccessToken({ userId: user.id, role: user.role });
    return res.json({ accessToken });
  } catch (err) {
    return next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getMe(req.userId!);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const data = forgotPasswordSchema.parse(req.body);
    const result = await authService.forgotPassword(data);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const result = await authService.resetPassword(data);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}
