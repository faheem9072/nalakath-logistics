-- =============================================================================
-- FLEETFLOW CONSOLIDATED DATABASE SCHEMA & SEED SCRIPT
-- Transport Corporation Fleet Management System (~50 Vehicles)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
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

-- 6. ASSIGNMENTS
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

-- 7. TRIPS
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

-- 8. ASSIGNMENT EVENTS
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

-- 9. AUDIT LOGS
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

-- INDEXES
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

-- FUNCTIONS & TRIGGERS
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_driver_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT d.id FROM public.drivers d
    JOIN public.profiles p ON d.profile_id = p.id OR d.phone = p.phone
    WHERE p.id = auth.uid()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.check_assignment_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_vehicle_status TEXT;
    v_vehicle_reg TEXT;
    v_driver_status TEXT;
    v_driver_name TEXT;
    v_conflicting_assignment UUID;
BEGIN
    SELECT status, registration_number INTO v_vehicle_status, v_vehicle_reg
    FROM public.vehicles WHERE id = NEW.vehicle_id;

    IF v_vehicle_status = 'maintenance' THEN
        RAISE EXCEPTION 'Cannot assign vehicle %: Vehicle is currently under maintenance.', v_vehicle_reg;
    END IF;

    IF v_vehicle_status = 'inactive' THEN
        RAISE EXCEPTION 'Cannot assign vehicle %: Vehicle is marked inactive.', v_vehicle_reg;
    END IF;

    SELECT status, full_name INTO v_driver_status, v_driver_name
    FROM public.drivers WHERE id = NEW.driver_id;

    IF v_driver_status != 'active' THEN
        RAISE EXCEPTION 'Cannot assign driver %: Driver status is % (must be active).', v_driver_name, v_driver_status;
    END IF;

    IF NEW.status NOT IN ('cancelled', 'reassigned') THEN
        SELECT id INTO v_conflicting_assignment
        FROM public.assignments
        WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
          AND duty_date = NEW.duty_date
          AND driver_id = NEW.driver_id
          AND status NOT IN ('cancelled', 'reassigned')
          AND (NEW.planned_start_time < planned_end_time AND NEW.planned_end_time > planned_start_time)
        LIMIT 1;

        IF v_conflicting_assignment IS NOT NULL THEN
            RAISE EXCEPTION 'Schedule conflict: Driver % is already assigned to another duty on % overlapping % - %.',
                v_driver_name, NEW.duty_date, NEW.planned_start_time, NEW.planned_end_time;
        END IF;

        SELECT id INTO v_conflicting_assignment
        FROM public.assignments
        WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
          AND duty_date = NEW.duty_date
          AND vehicle_id = NEW.vehicle_id
          AND status NOT IN ('cancelled', 'reassigned')
          AND (NEW.planned_start_time < planned_end_time AND NEW.planned_end_time > planned_start_time)
        LIMIT 1;

        IF v_conflicting_assignment IS NOT NULL THEN
            RAISE EXCEPTION 'Schedule conflict: Vehicle % is already assigned to another duty on % overlapping % - %.',
                v_vehicle_reg, NEW.duty_date, NEW.planned_start_time, NEW.planned_end_time;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_assignment_overlap ON public.assignments;
CREATE TRIGGER trg_check_assignment_overlap
    BEFORE INSERT OR UPDATE ON public.assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.check_assignment_overlap();

CREATE OR REPLACE FUNCTION public.log_assignment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.assignment_events (
        assignment_id,
        event_type,
        performed_by,
        new_driver_id,
        new_vehicle_id,
        reason,
        metadata
    ) VALUES (
        NEW.id,
        'created',
        NEW.created_by,
        NEW.driver_id,
        NEW.vehicle_id,
        'Assignment created',
        jsonb_build_object(
            'duty_date', NEW.duty_date,
            'planned_start_time', NEW.planned_start_time,
            'planned_end_time', NEW.planned_end_time,
            'route_id', NEW.route_id,
            'team_id', NEW.team_id
        )
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_assignment_created ON public.assignments;
CREATE TRIGGER trg_log_assignment_created
    AFTER INSERT ON public.assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.log_assignment_created();

CREATE OR REPLACE FUNCTION public.confirm_duty(p_assignment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_assignment RECORD;
    v_user_role TEXT;
    v_driver_id UUID;
BEGIN
    v_user_role := public.get_current_user_role();
    v_driver_id := public.get_current_driver_id();

    SELECT * INTO v_assignment FROM public.assignments WHERE id = p_assignment_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Assignment not found';
    END IF;

    IF v_assignment.status != 'scheduled' THEN
        RAISE EXCEPTION 'Assignment cannot be confirmed because current status is %', v_assignment.status;
    END IF;

    IF v_user_role = 'driver' AND v_assignment.driver_id != v_driver_id THEN
        RAISE EXCEPTION 'Unauthorized: You may only confirm your own duty assignments';
    END IF;

    UPDATE public.assignments
    SET status = 'confirmed',
        driver_confirmed_at = now(),
        updated_at = now()
    WHERE id = p_assignment_id;

    INSERT INTO public.assignment_events (
        assignment_id,
        event_type,
        performed_by,
        new_driver_id,
        new_vehicle_id,
        reason
    ) VALUES (
        p_assignment_id,
        'confirmed',
        auth.uid(),
        v_assignment.driver_id,
        v_assignment.vehicle_id,
        'Driver confirmed duty assignment'
    );

    RETURN jsonb_build_object('success', true, 'assignment_id', p_assignment_id, 'status', 'confirmed');
END;
$$;

CREATE OR REPLACE FUNCTION public.start_trip(
    p_assignment_id UUID,
    p_start_odometer NUMERIC,
    p_actual_destination TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_assignment RECORD;
    v_user_role TEXT;
    v_driver_id UUID;
    v_next_trip_num INTEGER;
    v_trip_id UUID;
BEGIN
    v_user_role := public.get_current_user_role();
    v_driver_id := public.get_current_driver_id();

    SELECT * INTO v_assignment FROM public.assignments WHERE id = p_assignment_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Assignment not found';
    END IF;

    IF v_assignment.status IN ('completed', 'cancelled', 'reassigned') THEN
        RAISE EXCEPTION 'Cannot start trip for an assignment that is %', v_assignment.status;
    END IF;

    IF v_user_role = 'driver' AND v_assignment.driver_id != v_driver_id THEN
        RAISE EXCEPTION 'Unauthorized: You may only start trips for your own assignments';
    END IF;

    IF p_start_odometer < 0 THEN
        RAISE EXCEPTION 'Start odometer reading cannot be negative';
    END IF;

    SELECT COALESCE(MAX(trip_number), 0) + 1 INTO v_next_trip_num
    FROM public.trips
    WHERE assignment_id = p_assignment_id;

    INSERT INTO public.trips (
        assignment_id,
        trip_number,
        status,
        start_time,
        start_odometer,
        assigned_route_id,
        actual_destination,
        driver_notes
    ) VALUES (
        p_assignment_id,
        v_next_trip_num,
        'in_progress',
        now(),
        p_start_odometer,
        v_assignment.route_id,
        p_actual_destination,
        p_notes
    ) RETURNING id INTO v_trip_id;

    UPDATE public.assignments
    SET status = 'in_progress',
        updated_at = now()
    WHERE id = p_assignment_id;

    INSERT INTO public.assignment_events (
        assignment_id,
        event_type,
        performed_by,
        new_driver_id,
        new_vehicle_id,
        reason,
        metadata
    ) VALUES (
        p_assignment_id,
        'started',
        auth.uid(),
        v_assignment.driver_id,
        v_assignment.vehicle_id,
        'Trip #' || v_next_trip_num || ' started',
        jsonb_build_object('trip_id', v_trip_id, 'trip_number', v_next_trip_num, 'start_odometer', p_start_odometer)
    );

    RETURN jsonb_build_object('success', true, 'trip_id', v_trip_id, 'trip_number', v_next_trip_num);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_trip(
    p_trip_id UUID,
    p_end_odometer NUMERIC,
    p_notes TEXT DEFAULT NULL,
    p_is_final_trip_of_duty BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_trip RECORD;
    v_assignment RECORD;
    v_user_role TEXT;
    v_driver_id UUID;
    v_distance NUMERIC;
    v_open_trips_count INTEGER;
BEGIN
    v_user_role := public.get_current_user_role();
    v_driver_id := public.get_current_driver_id();

    SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trip not found';
    END IF;

    IF v_trip.status != 'in_progress' THEN
        RAISE EXCEPTION 'Trip is not currently in progress (status: %)', v_trip.status;
    END IF;

    SELECT * INTO v_assignment FROM public.assignments WHERE id = v_trip.assignment_id FOR UPDATE;

    IF v_user_role = 'driver' AND v_assignment.driver_id != v_driver_id THEN
        RAISE EXCEPTION 'Unauthorized: You may only complete trips for your own assignments';
    END IF;

    IF p_end_odometer < v_trip.start_odometer THEN
        RAISE EXCEPTION 'End odometer (%) cannot be less than start odometer (%)',
            p_end_odometer, v_trip.start_odometer;
    END IF;

    v_distance := p_end_odometer - v_trip.start_odometer;

    UPDATE public.trips
    SET status = 'completed',
        end_time = now(),
        end_odometer = p_end_odometer,
        driver_notes = CASE
            WHEN p_notes IS NOT NULL AND length(trim(p_notes)) > 0 THEN
                COALESCE(driver_notes || E'\n' || p_notes, p_notes)
            ELSE driver_notes
        END,
        updated_at = now()
    WHERE id = p_trip_id;

    UPDATE public.vehicles
    SET current_odometer = GREATEST(current_odometer, p_end_odometer),
        updated_at = now()
    WHERE id = v_assignment.vehicle_id;

    SELECT COUNT(*) INTO v_open_trips_count
    FROM public.trips
    WHERE assignment_id = v_assignment.id
      AND status = 'in_progress';

    IF p_is_final_trip_of_duty AND v_open_trips_count = 0 THEN
        UPDATE public.assignments
        SET status = 'completed',
            updated_at = now()
        WHERE id = v_assignment.id;
    END IF;

    INSERT INTO public.assignment_events (
        assignment_id,
        event_type,
        performed_by,
        new_driver_id,
        new_vehicle_id,
        reason,
        metadata
    ) VALUES (
        v_assignment.id,
        'completed',
        auth.uid(),
        v_assignment.driver_id,
        v_assignment.vehicle_id,
        'Trip #' || v_trip.trip_number || ' completed',
        jsonb_build_object(
            'trip_id', p_trip_id,
            'trip_number', v_trip.trip_number,
            'distance_km', v_distance,
            'end_odometer', p_end_odometer
        )
    );

    RETURN jsonb_build_object('success', true, 'trip_id', p_trip_id, 'distance_km', v_distance);
END;
$$;

CREATE OR REPLACE FUNCTION public.reassign_assignment(
    p_assignment_id UUID,
    p_new_driver_id UUID,
    p_new_vehicle_id UUID,
    p_reason TEXT DEFAULT 'Operational reassignment'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_assignment RECORD;
    v_user_role TEXT;
    v_old_driver_id UUID;
    v_old_vehicle_id UUID;
BEGIN
    v_user_role := public.get_current_user_role();
    IF v_user_role NOT IN ('owner', 'dispatcher') THEN
        RAISE EXCEPTION 'Unauthorized: Only Owner or Dispatcher can reassign duties';
    END IF;

    SELECT * INTO v_assignment FROM public.assignments WHERE id = p_assignment_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Assignment not found';
    END IF;

    IF v_assignment.status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Cannot reassign an assignment that is already %', v_assignment.status;
    END IF;

    v_old_driver_id := v_assignment.driver_id;
    v_old_vehicle_id := v_assignment.vehicle_id;

    UPDATE public.assignments
    SET driver_id = COALESCE(p_new_driver_id, driver_id),
        vehicle_id = COALESCE(p_new_vehicle_id, vehicle_id),
        status = 'scheduled',
        driver_confirmed_at = NULL,
        updated_by = auth.uid(),
        updated_at = now()
    WHERE id = p_assignment_id;

    INSERT INTO public.assignment_events (
        assignment_id,
        event_type,
        performed_by,
        previous_driver_id,
        new_driver_id,
        previous_vehicle_id,
        new_vehicle_id,
        reason
    ) VALUES (
        p_assignment_id,
        'reassigned',
        auth.uid(),
        v_old_driver_id,
        COALESCE(p_new_driver_id, v_old_driver_id),
        v_old_vehicle_id,
        COALESCE(p_new_vehicle_id, v_old_vehicle_id),
        p_reason
    );

    RETURN jsonb_build_object('success', true, 'assignment_id', p_assignment_id, 'status', 'scheduled');
END;
$$;

-- RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Owners and dispatchers can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.get_current_user_role() IN ('owner', 'dispatcher'));
CREATE POLICY "Only owners can insert or update profiles" ON public.profiles FOR ALL TO authenticated USING (public.get_current_user_role() = 'owner') WITH CHECK (public.get_current_user_role() = 'owner');

CREATE POLICY "Staff can view teams" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners and dispatchers can manage teams" ON public.teams FOR ALL TO authenticated USING (public.get_current_user_role() IN ('owner', 'dispatcher')) WITH CHECK (public.get_current_user_role() IN ('owner', 'dispatcher'));

CREATE POLICY "Staff can view routes" ON public.routes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners and dispatchers can manage routes" ON public.routes FOR ALL TO authenticated USING (public.get_current_user_role() IN ('owner', 'dispatcher')) WITH CHECK (public.get_current_user_role() IN ('owner', 'dispatcher'));

CREATE POLICY "Staff can view vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners and dispatchers can manage vehicles" ON public.vehicles FOR ALL TO authenticated USING (public.get_current_user_role() IN ('owner', 'dispatcher')) WITH CHECK (public.get_current_user_role() IN ('owner', 'dispatcher'));

CREATE POLICY "Owners and dispatchers can view all drivers" ON public.drivers FOR SELECT TO authenticated USING (public.get_current_user_role() IN ('owner', 'dispatcher'));
CREATE POLICY "Drivers can view only their own driver profile" ON public.drivers FOR SELECT TO authenticated USING (id = public.get_current_driver_id());
CREATE POLICY "Owners can manage drivers" ON public.drivers FOR ALL TO authenticated USING (public.get_current_user_role() = 'owner') WITH CHECK (public.get_current_user_role() = 'owner');
CREATE POLICY "Dispatchers can update driver status" ON public.drivers FOR UPDATE TO authenticated USING (public.get_current_user_role() = 'dispatcher') WITH CHECK (public.get_current_user_role() = 'dispatcher');

CREATE POLICY "Owners and dispatchers can view all assignments" ON public.assignments FOR SELECT TO authenticated USING (public.get_current_user_role() IN ('owner', 'dispatcher'));
CREATE POLICY "Drivers can view only their own assignments" ON public.assignments FOR SELECT TO authenticated USING (driver_id = public.get_current_driver_id());
CREATE POLICY "Owners and dispatchers can create and modify assignments" ON public.assignments FOR ALL TO authenticated USING (public.get_current_user_role() IN ('owner', 'dispatcher')) WITH CHECK (public.get_current_user_role() IN ('owner', 'dispatcher'));

CREATE POLICY "Owners and dispatchers can view all trips" ON public.trips FOR SELECT TO authenticated USING (public.get_current_user_role() IN ('owner', 'dispatcher'));
CREATE POLICY "Drivers can view only their own trips" ON public.trips FOR SELECT TO authenticated USING (assignment_id IN (SELECT a.id FROM public.assignments a WHERE a.driver_id = public.get_current_driver_id()));
CREATE POLICY "Owners and dispatchers can manage trips" ON public.trips FOR ALL TO authenticated USING (public.get_current_user_role() IN ('owner', 'dispatcher')) WITH CHECK (public.get_current_user_role() IN ('owner', 'dispatcher'));

CREATE POLICY "Owners and dispatchers can view all assignment events" ON public.assignment_events FOR SELECT TO authenticated USING (public.get_current_user_role() IN ('owner', 'dispatcher'));
CREATE POLICY "Drivers can view events for their own assignments" ON public.assignment_events FOR SELECT TO authenticated USING (assignment_id IN (SELECT a.id FROM public.assignments a WHERE a.driver_id = public.get_current_driver_id()));
CREATE POLICY "Authenticated users can insert assignment events" ON public.assignment_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Owners and dispatchers can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.get_current_user_role() IN ('owner', 'dispatcher'));
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
