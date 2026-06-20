import { z } from 'zod';

export const createBookingSchema = z.object({
  destinationIds: z
    .array(z.string().cuid('Invalid destination ID'))
    .min(1, 'At least one destination must be selected'),
  tripOptionIds: z.array(z.string().cuid('Invalid trip option ID')).default([]),
  travelDate: z.string().optional().nullable(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
