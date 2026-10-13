-- =============================================================================
-- Migration 00001: Initial Schema for FleetFlow
-- Core Tables: profiles, drivers, vehicles, teams, routes, assignments, trips,
-- assignment_events, audit_logs
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'driver' CHECK (role IN ('owner', 'dispatcher', 'driver')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TEAMS (Clients / Departments / Corporate contracts)
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    contact_person TEXT,
    contact_phone TEXT,
    billing_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ROUTES
CREATE TABLE IF NOT EXISTS public.routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    planned_distance_km NUMERIC(8,2) NOT NULL DEFAULT 0.0 CHECK (planned_distance_km >= 0),
    estimated_duration_minutes INTEGER CHECK (estimated_duration_minutes > 0),
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. VEHICLES
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_number TEXT UNIQUE NOT NULL,
    make_model TEXT NOT NULL,
    vehicle_type TEXT NOT NULL DEFAULT 'bus' CHECK (vehicle_type IN ('bus', 'mini_bus', 'van', 'truck', 'car', 'other')),
    capacity INTEGER NOT NULL DEFAULT 20 CHECK (capacity > 0),
    current_odometer NUMERIC(10,2) NOT NULL DEFAULT 0.0 CHECK (current_odometer >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. DRIVERS
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
    employee_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    license_number TEXT NOT NULL,
    license_expiry DATE NOT NULL,
    is_fixed_route BOOLEAN NOT NULL DEFAULT false,
    default_route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. ASSIGNMENTS (Daily Duty Allocations)
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    duty_date DATE NOT NULL,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    planned_start_time TIME NOT NULL,
    planned_end_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'reassigned')),
    driver_confirmed_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_assignment_times CHECK (planned_end_time > planned_start_time)
);

-- 7. TRIPS (Multiple trips under one assignment)
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    trip_number INTEGER NOT NULL CHECK (trip_number > 0),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    start_odometer NUMERIC(10,2) CHECK (start_odometer IS NULL OR start_odometer >= 0),
    end_odometer NUMERIC(10,2),
    assigned_route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
    actual_destination TEXT,
    driver_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_assignment_trip_number UNIQUE (assignment_id, trip_number),
    CONSTRAINT chk_trip_odometer CHECK (end_odometer IS NULL OR (start_odometer IS NOT NULL AND end_odometer >= start_odometer)),
    CONSTRAINT chk_trip_times CHECK (end_time IS NULL OR (start_time IS NOT NULL AND end_time >= start_time))
);

-- 8. ASSIGNMENT EVENTS (Audit trail for reassignments, cancellations, edits)
CREATE TABLE IF NOT EXISTS public.assignment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('created', 'confirmed', 'started', 'completed', 'reassigned', 'cancelled', 'edited')),
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    previous_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    new_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    previous_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    new_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. AUDIT LOGS (System-wide administrative and security actions)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES for Search, Joins, and Reports
CREATE INDEX IF NOT EXISTS idx_assignments_duty_date ON public.assignments(duty_date);
CREATE INDEX IF NOT EXISTS idx_assignments_driver_id ON public.assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_assignments_vehicle_id ON public.assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_team_id ON public.assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_assignments_route_id ON public.assignments(route_id);

CREATE INDEX IF NOT EXISTS idx_trips_assignment_id ON public.trips(assignment_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_start_time ON public.trips(start_time);
CREATE INDEX IF NOT EXISTS idx_trips_end_time ON public.trips(end_time);

CREATE INDEX IF NOT EXISTS idx_drivers_phone ON public.drivers(phone);
CREATE INDEX IF NOT EXISTS idx_drivers_employee_code ON public.drivers(employee_code);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers(status);

CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON public.vehicles(registration_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);

CREATE INDEX IF NOT EXISTS idx_assignment_events_assignment_id ON public.assignment_events(assignment_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
