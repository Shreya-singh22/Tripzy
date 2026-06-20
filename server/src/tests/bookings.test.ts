import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import * as dotenv from 'dotenv';

dotenv.config();

import app from '../app';
import { prisma } from '../db/prisma';

const TEST_EMAIL = 'vitest-booking@example.com';

let accessToken: string;
let parisId: string;
let tokyoId: string;
let flightId: string;
let hotelId: string;

beforeAll(async () => {
  // Clean slate
  const existing = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  if (existing) {
    await prisma.bookingItem.deleteMany({ where: { booking: { userId: existing.id } } });
    await prisma.booking.deleteMany({ where: { userId: existing.id } });
    await prisma.user.delete({ where: { email: TEST_EMAIL } });
  }

  const regRes = await request(app).post('/api/auth/register').send({
    name: 'Booking Test',
    email: TEST_EMAIL,
    phone: '9000000001',
    pinCode: '400001',
    password: 'Password1',
  });
  accessToken = regRes.body.accessToken;

  const destsRes = await request(app).get('/api/destinations');
  const paris = destsRes.body.find((d: { slug: string }) => d.slug === 'paris');
  const tokyo = destsRes.body.find((d: { slug: string }) => d.slug === 'tokyo');
  parisId = paris.id;
  tokyoId = tokyo.id;

  const optsRes = await request(app).get('/api/trip-options');
  const flight = optsRes.body.find((o: { optionKey: string }) => o.optionKey === 'flight');
  const hotel = optsRes.body.find((o: { optionKey: string }) => o.optionKey === 'hotel');
  flightId = flight.id;
  hotelId = hotel.id;
});

afterAll(async () => {
  const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  if (user) {
    await prisma.bookingItem.deleteMany({ where: { booking: { userId: user.id } } });
    await prisma.booking.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { email: TEST_EMAIL } });
  }
  await prisma.$disconnect();
});

describe('POST /api/bookings — price computation', () => {
  it('computes total server-side: Paris(450) + Flight(1200) = 1650', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ destinationIds: [parisId], tripOptionIds: [flightId] });

    expect(res.status).toBe(201);
    expect(res.body.booking.total).toBe(1650);
    expect(res.body.booking.reference).toMatch(/^TRP-[A-Z0-9]{8}$/);
    expect(res.body.booking.items).toHaveLength(2);
  });

  it('computes multi-destination total: Paris(450) + Tokyo(580) + Hotel(2100) = 3130', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ destinationIds: [parisId, tokyoId], tripOptionIds: [hotelId] });

    expect(res.status).toBe(201);
    expect(res.body.booking.total).toBe(3130);
    expect(res.body.booking.items).toHaveLength(3);
  });

  it('snapshot: priceAtBooking matches current DB price', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ destinationIds: [parisId], tripOptionIds: [] });

    const parisItem = res.body.booking.items.find(
      (i: { destination?: { slug: string } }) => i.destination?.slug === 'paris',
    );
    expect(parisItem.priceAtBooking).toBe(450);
  });

  it('requires at least one destination (400)', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ destinationIds: [], tripOptionIds: [flightId] });

    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated request (401)', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ destinationIds: [parisId], tripOptionIds: [] });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/bookings', () => {
  it("returns the authenticated user's bookings", async () => {
    const res = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('GET /api/bookings/:ref', () => {
  let ref: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ destinationIds: [parisId], tripOptionIds: [] });
    ref = res.body.booking.reference;
  });

  it('returns the booking by reference for its owner', async () => {
    const res = await request(app)
      .get(`/api/bookings/${ref}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.booking.reference).toBe(ref);
  });

  it('returns 404 for a nonexistent reference', async () => {
    const res = await request(app)
      .get('/api/bookings/TRP-NOTEXIST')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });
});
