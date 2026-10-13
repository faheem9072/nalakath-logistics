import { z } from 'zod';

export const vehicleSchema = z.object({
  registration_number: z
    .string()
    .min(3, 'Registration number too short')
    .max(20, 'Registration number too long')
    .transform((val) => val.trim().toUpperCase()),
  make_model: z.string().min(2, 'Make and model is required'),
  vehicle_type: z.enum(['bus', 'mini_bus', 'van', 'truck', 'car', 'other']),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
  current_odometer: z.coerce.number().min(0, 'Odometer cannot be negative'),
  status: z.enum(['active', 'maintenance', 'inactive']),
  notes: z.string().max(500).optional().nullable(),
});

export const driverSchema = z.object({
  employee_code: z
    .string()
    .min(2, 'Employee code required')
    .transform((val) => val.trim().toUpperCase()),
  full_name: z.string().min(2, 'Full name is required'),
  phone: z
    .string()
    .min(10, 'Valid phone required')
    .regex(/^\+?[1-9]\d{9,14}$/, 'International phone format (e.g. +919400112233)'),
  license_number: z.string().min(4, 'License number is required'),
  license_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid expiry date required (YYYY-MM-DD)'),
  is_fixed_route: z.boolean().default(false),
  default_route_id: z.string().uuid().optional().nullable(),
  status: z.enum(['active', 'inactive', 'on_leave']),
  notes: z.string().max(500).optional().nullable(),
});

export const teamSchema = z.object({
  name: z.string().min(2, 'Client/Team name is required'),
  contact_person: z.string().max(100).optional().nullable(),
  contact_phone: z.string().max(20).optional().nullable(),
  billing_notes: z.string().max(500).optional().nullable(),
  is_active: z.boolean().default(true),
});

export const routeSchema = z.object({
  code: z
    .string()
    .min(2, 'Route code required')
    .transform((val) => val.trim().toUpperCase()),
  name: z.string().min(2, 'Route name required'),
  origin: z.string().min(2, 'Origin location required'),
  destination: z.string().min(2, 'Destination location required'),
  planned_distance_km: z.coerce.number().min(0, 'Distance must be positive'),
  estimated_duration_minutes: z.coerce.number().int().min(1).optional().nullable(),
  team_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
});

export type VehicleFormValues = z.infer<typeof vehicleSchema>;
export type DriverFormValues = z.infer<typeof driverSchema>;
export type TeamFormValues = z.infer<typeof teamSchema>;
export type RouteFormValues = z.infer<typeof routeSchema>;
