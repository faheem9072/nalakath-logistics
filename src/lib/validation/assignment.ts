import { z } from 'zod';

export const assignmentFormSchema = z
  .object({
    duty_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please select a valid date'),
    driver_id: z.string().uuid('Please select a valid driver'),
    vehicle_id: z.string().uuid('Please select a valid vehicle'),
    route_id: z.string().uuid().nullable().optional(),
    team_id: z.string().uuid().nullable().optional(),
    planned_start_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Format must be HH:MM'),
    planned_end_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Format must be HH:MM'),
    notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().nullable(),
  })
  .refine(
    (data) => {
      // Basic check that start time is before end time for single duty interval
      const start = data.planned_start_time.slice(0, 5);
      const end = data.planned_end_time.slice(0, 5);
      return end > start;
    },
    {
      message: 'End time must be after start time',
      path: ['planned_end_time'],
    }
  );

export const reassignSchema = z.object({
  assignment_id: z.string().uuid(),
  new_driver_id: z.string().uuid('Please select a replacement driver').optional(),
  new_vehicle_id: z.string().uuid('Please select a replacement vehicle').optional(),
  reason: z.string().min(3, 'Please provide a clear reason for reassignment (audit required)'),
});

export type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;
export type ReassignFormValues = z.infer<typeof reassignSchema>;
