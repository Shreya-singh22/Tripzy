import { prisma } from '../db/prisma';
import { AppError } from '../utils/errors';

export interface DestinationDTO {
  id: string;
  slug: string;
  name: string;
  country: string;
  description: string;
  bestTimeToVisit: string[];
  topAttractions: string[];
  travelTips: string[];
  tags: string[];
  images: string[];
  basePrice: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Single place that parses JSON string columns into real arrays. */
function parse(raw: {
  id: string;
  slug: string;
  name: string;
  country: string;
  description: string;
  bestTimeToVisit: string;
  topAttractions: string;
  travelTips: string;
  tags: string;
  images: string;
  basePrice: number;
  createdAt: Date;
  updatedAt: Date;
}): DestinationDTO {
  return {
    ...raw,
    bestTimeToVisit: JSON.parse(raw.bestTimeToVisit),
    topAttractions: JSON.parse(raw.topAttractions),
    travelTips: JSON.parse(raw.travelTips),
    tags: JSON.parse(raw.tags),
    images: JSON.parse(raw.images),
  };
}

export async function getAllDestinations(): Promise<DestinationDTO[]> {
  const rows = await prisma.destination.findMany({ orderBy: { createdAt: 'asc' } });
  return rows.map(parse);
}

export async function getDestinationBySlug(slug: string): Promise<DestinationDTO> {
  const row = await prisma.destination.findUnique({ where: { slug } });
  if (!row) throw new AppError(404, 'NOT_FOUND', `Destination "${slug}" not found`);
  return parse(row);
}

export interface CreateDestinationInput {
  slug: string;
  name: string;
  country: string;
  description: string;
  bestTimeToVisit: string[];
  topAttractions: string[];
  travelTips: string[];
  tags: string[];
  images: string[];
  basePrice: number;
}

/** Single place that stringifies array columns before writing. */
function stringify(data: CreateDestinationInput) {
  return {
    ...data,
    bestTimeToVisit: JSON.stringify(data.bestTimeToVisit),
    topAttractions: JSON.stringify(data.topAttractions),
    travelTips: JSON.stringify(data.travelTips),
    tags: JSON.stringify(data.tags),
    images: JSON.stringify(data.images),
  };
}

export async function createDestination(data: CreateDestinationInput): Promise<DestinationDTO> {
  const existing = await prisma.destination.findUnique({ where: { slug: data.slug } });
  if (existing) throw new AppError(409, 'CONFLICT', `Slug "${data.slug}" already exists`);
  const row = await prisma.destination.create({ data: stringify(data) });
  return parse(row);
}

export async function updateDestination(
  id: string,
  data: Partial<CreateDestinationInput>,
): Promise<DestinationDTO> {
  const existing = await prisma.destination.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Destination not found');

  const payload: Record<string, unknown> = { ...data };
  if (data.bestTimeToVisit) payload.bestTimeToVisit = JSON.stringify(data.bestTimeToVisit);
  if (data.topAttractions) payload.topAttractions = JSON.stringify(data.topAttractions);
  if (data.travelTips) payload.travelTips = JSON.stringify(data.travelTips);
  if (data.tags) payload.tags = JSON.stringify(data.tags);
  if (data.images) payload.images = JSON.stringify(data.images);

  const row = await prisma.destination.update({ where: { id }, data: payload });
  return parse(row);
}

export async function deleteDestination(id: string): Promise<void> {
  const existing = await prisma.destination.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Destination not found');
  await prisma.destination.delete({ where: { id } });
}
