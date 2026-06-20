import { prisma } from '../db/prisma';
import { AppError } from '../utils/errors';
import type { CreateBookingInput } from '../validation/booking.schema';

function generateRef(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = 'TRP-';
  for (let i = 0; i < 8; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

async function uniqueRef(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const ref = generateRef();
    const hit = await prisma.booking.findUnique({ where: { reference: ref } });
    if (!hit) return ref;
  }
  throw new AppError(500, 'INTERNAL_ERROR', 'Could not generate a unique booking reference');
}

const BOOKING_INCLUDE = {
  items: {
    include: {
      destination: { select: { id: true, slug: true, name: true, country: true, images: true } },
      tripOption: { select: { id: true, optionKey: true, category: true, title: true, emoji: true } },
    },
  },
  user: { select: { id: true, name: true, email: true, phone: true } },
} as const;

export async function createBooking(userId: string, data: CreateBookingInput) {
  const { destinationIds, tripOptionIds } = data;

  // Validate destinations exist
  const destinations = await prisma.destination.findMany({
    where: { id: { in: destinationIds } },
  });
  if (destinations.length !== destinationIds.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'One or more destinations not found');
  }

  // Validate trip options exist
  const tripOptions =
    tripOptionIds.length > 0
      ? await prisma.tripOption.findMany({ where: { id: { in: tripOptionIds } } })
      : [];
  if (tripOptions.length !== tripOptionIds.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'One or more trip options not found');
  }

  // Server-side total — client-sent prices are never used
  const total =
    destinations.reduce((sum, d) => sum + d.basePrice, 0) +
    tripOptions.reduce((sum, o) => sum + o.price, 0);

  const reference = await uniqueRef();

  const booking = await prisma.booking.create({
    data: {
      reference,
      userId,
      total,
      travelDate: data.travelDate ? new Date(data.travelDate) : null,
      items: {
        create: [
          ...destinations.map((d) => ({
            destinationId: d.id,
            priceAtBooking: d.basePrice,
          })),
          ...tripOptions.map((o) => ({
            tripOptionId: o.id,
            priceAtBooking: o.price,
          })),
        ],
      },
    },
    include: BOOKING_INCLUDE,
  });

  return booking;
}

export async function getUserBookings(userId: string) {
  return prisma.booking.findMany({
    where: { userId },
    include: BOOKING_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getBookingByRef(reference: string, requesterId: string, requesterRole: string) {
  const booking = await prisma.booking.findUnique({
    where: { reference },
    include: BOOKING_INCLUDE,
  });
  if (!booking) throw new AppError(404, 'NOT_FOUND', 'Booking not found');
  if (booking.userId !== requesterId && requesterRole !== 'ADMIN') {
    throw new AppError(403, 'FORBIDDEN', 'Access denied');
  }
  return booking;
}
