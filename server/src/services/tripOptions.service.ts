import { prisma } from '../db/prisma';

export async function getAllTripOptions() {
  return prisma.tripOption.findMany({ orderBy: [{ category: 'asc' }, { price: 'asc' }] });
}
