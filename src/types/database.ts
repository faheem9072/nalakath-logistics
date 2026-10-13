export type UserRole = 'owner' | 'dispatcher' | 'driver';

export type VehicleStatus = 'active' | 'maintenance' | 'inactive';
export type VehicleType = 'bus' | 'mini_bus' | 'van' | 'truck' | 'car' | 'other';

export type DriverStatus = 'active' | 'inactive' | 'on_leave';

export type AssignmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'reassigned';

export type TripStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type AssignmentEventType =
  | 'created'
  | 'confirmed'
  | 'started'
  | 'completed'
  | 'reassigned'
  | 'cancelled'
  | 'edited';

export interface Profile {
  id: string;
  phone: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  contact_person: string | null;
  contact_phone: string | null;
  billing_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Route {
  id: string;
  code: string;
  name: string;
  origin: string;
  destination: string;
  planned_distance_km: number;
  estimated_duration_minutes: number | null;
  team_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  registration_number: string;
  make_model: string;
  vehicle_type: VehicleType;
  capacity: number;
  current_odometer: number;
  status: VehicleStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  profile_id: string | null;
  employee_code: string;
  full_name: string;
  phone: string;
  license_number: string;
  license_expiry: string;
  is_fixed_route: boolean;
  default_route_id: string | null;
  status: DriverStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  duty_date: string; // YYYY-MM-DD
  driver_id: string;
  vehicle_id: string;
  route_id: string | null;
  team_id: string | null;
  planned_start_time: string; // HH:MM or HH:MM:SS
  planned_end_time: string; // HH:MM or HH:MM:SS
  status: AssignmentStatus;
  driver_confirmed_at: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  assignment_id: string;
  trip_number: number;
  status: TripStatus;
  start_time: string | null;
  end_time: string | null;
  start_odometer: number | null;
  end_odometer: number | null;
  assigned_route_id: string | null;
  actual_destination: string | null;
  driver_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentEvent {
  id: string;
  assignment_id: string;
  event_type: AssignmentEventType;
  performed_by: string | null;
  previous_driver_id: string | null;
  new_driver_id: string | null;
  previous_vehicle_id: string | null;
  new_vehicle_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}
