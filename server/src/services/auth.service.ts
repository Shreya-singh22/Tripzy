import crypto from 'crypto';
import { prisma } from '../db/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/tokens';
import { AppError } from '../utils/errors';
import type { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from '../validation/auth.schema';

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  pinCode: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Record<string, boolean>;

function issueTokens(userId: string, role: string) {
  return {
    accessToken: generateAccessToken({ userId, role }),
    refreshToken: generateRefreshToken({ userId, role }),
  };
}

export async function register(data: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError(409, 'CONFLICT', 'Email already registered');

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      pinCode: data.pinCode,
      passwordHash: await hashPassword(data.password),
    },
    select: SAFE_SELECT,
  });

  const { accessToken, refreshToken } = issueTokens(user.id, user.role);
  return { user, accessToken, refreshToken };
}

export async function login(data: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');

  const valid = await comparePassword(data.password, user.passwordHash);
  if (!valid) throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    pinCode: user.pinCode,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  const { accessToken, refreshToken } = issueTokens(user.id, user.role);
  return { user: safeUser, accessToken, refreshToken };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: SAFE_SELECT });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  return user;
}

export async function forgotPassword(data: ForgotPasswordInput) {
  const user = await prisma.user.findUnique({ where: { email: data.email } });

  // Always respond the same way to prevent email enumeration
  if (!user) {
    return { message: 'If that email is registered, a reset code has been sent.' };
  }

  // Delete any old tokens for this user
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  // 8-character alphanumeric code (upper-case, no ambiguous chars)
  const token = crypto.randomBytes(6).toString('hex').toUpperCase();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  // Production: send email here. Dev: expose in response.
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] Password reset code for ${user.email}: ${token}`);
    return { message: 'Reset code generated.', devToken: token };
  }

  return { message: 'If that email is registered, a reset code has been sent.' };
}

export async function resetPassword(data: ResetPasswordInput) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token: data.token },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError(400, 'INVALID_TOKEN', 'Reset code is invalid or has expired');
  }

  const passwordHash = await hashPassword(data.newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return { message: 'Password updated successfully' };
}
