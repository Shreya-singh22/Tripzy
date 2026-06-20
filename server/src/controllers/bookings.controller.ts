import { Request, Response, NextFunction } from 'express';
import { createBookingSchema } from '../validation/booking.schema';
import * as svc from '../services/bookings.service';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createBookingSchema.parse(req.body);
    const booking = await svc.createBooking(req.userId!, data);
    return res.status(201).json({ booking });
  } catch (err) {
    return next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const bookings = await svc.getUserBookings(req.userId!);
    return res.json(bookings);
  } catch (err) {
    return next(err);
  }
}

export async function getByRef(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await svc.getBookingByRef(
      req.params.ref,
      req.userId!,
      req.userRole!,
    );
    return res.json({ booking });
  } catch (err) {
    return next(err);
  }
}
