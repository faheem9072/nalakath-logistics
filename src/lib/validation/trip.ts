import { z } from 'zod';

export const startTripSchema = z.object({
  assignment_id: z.string().uuid(),
  start_odometer: z.coerce
    .number()
    .min(0, 'Odometer reading cannot be negative'),
  actual_destination: z.string().max(200, 'Destination name too long').optional().nullable(),
  notes: z.string().max(500, 'Notes too long').optional().nullable(),
});

export const completeTripSchema = z
  .object({
    trip_id: z.string().uuid(),
    start_odometer: z.coerce.number().min(0),
    end_odometer: z.coerce
      .number()
      .min(0, 'Odometer reading cannot be negative'),
    notes: z.string().max(500, 'Notes too long').optional().nullable(),
    is_final_trip_of_duty: z.boolean().default(true),
  })
  .refine((data) => data.end_odometer >= data.start_odometer, {
    message: 'End odometer reading cannot be less than start odometer reading',
    path: ['end_odometer'],
  });

export type StartTripFormValues = z.infer<typeof startTripSchema>;
export type CompleteTripFormValues = z.infer<typeof completeTripSchema>;
