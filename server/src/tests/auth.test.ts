import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import * as dotenv from 'dotenv';

dotenv.config();

import app from '../app';
import { prisma } from '../db/prisma';

const TEST_PREFIX = 'vitest-auth-';
const TEST_EMAIL = `${TEST_PREFIX}user@example.com`;
const TEST_DUP_EMAIL = `${TEST_PREFIX}dup@example.com`;

const baseUser = {
  name: 'Test User',
  email: TEST_EMAIL,
  phone: '9876543210',
  pinCode: '400001',
  password: 'Password1',
};

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } });
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  it('registers a new user and returns accessToken + safe user object', async () => {
    const res = await request(app).post('/api/auth/register').send(baseUser);
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(TEST_EMAIL);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.pinCode).toBe('400001'); // stored plain — it's address data
    expect(res.body.accessToken).toBeDefined();
  });

  it('rejects duplicate email with 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...baseUser, email: TEST_EMAIL });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects invalid phone (not 10 digits)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...baseUser, email: `${TEST_PREFIX}x@example.com`, phone: '123' });
    expect(res.status).toBe(400);
  });

  it('rejects weak password (missing digit)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...baseUser, email: `${TEST_PREFIX}y@example.com`, password: 'Ndigitshere' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ ...baseUser, email: TEST_DUP_EMAIL });
  });

  it('returns accessToken on correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_DUP_EMAIL, password: 'Password1' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_DUP_EMAIL, password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects unknown email with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password1' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_DUP_EMAIL, password: 'Password1' });
    accessToken = res.body.accessToken;
  });

  it('returns current user with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(TEST_DUP_EMAIL);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
