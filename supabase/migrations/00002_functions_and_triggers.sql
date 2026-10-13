-- =============================================================================
-- Migration 00002: Functions, Overlap Prevention, Stored Procedures, and Triggers
-- Concurrency-safe duty allocations and state machine transitions
-- =============================================================================

-- 1. Helper function: Get current user role from profiles
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Helper function: Get driver id for current authenticated user
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

-- 3. Overlap and Conflict Validation Trigger Function
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
    -- Check Vehicle status
    SELECT status, registration_number INTO v_vehicle_status, v_vehicle_reg
    FROM public.vehicles WHERE id = NEW.vehicle_id;

    IF v_vehicle_status = 'maintenance' THEN
        RAISE EXCEPTION 'Cannot assign vehicle %: Vehicle is currently under maintenance.', v_vehicle_reg;
    END IF;

    IF v_vehicle_status = 'inactive' THEN
        RAISE EXCEPTION 'Cannot assign vehicle %: Vehicle is marked inactive.', v_vehicle_reg;
    END IF;

    -- Check Driver status
    SELECT status, full_name INTO v_driver_status, v_driver_name
    FROM public.drivers WHERE id = NEW.driver_id;

    IF v_driver_status != 'active' THEN
        RAISE EXCEPTION 'Cannot assign driver %: Driver status is % (must be active).', v_driver_name, v_driver_status;
    END IF;

    -- Overlap prevention applies only to active/scheduled assignments
    IF NEW.status NOT IN ('cancelled', 'reassigned') THEN
        -- Check driver overlapping schedule on same duty date
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

        -- Check vehicle overlapping schedule on same duty date
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

-- 4. Automatically record assignment creation event
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

-- 5. Safe Driver Confirmation RPC
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

    -- Drivers can only confirm their own assignments; Owners/Dispatchers can confirm any
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

    RETURN jsonb_build_object(
        'success', true,
        'assignment_id', p_assignment_id,
        'status', 'confirmed',
        'confirmed_at', now()
    );
END;
$$;

-- 6. Start Trip RPC
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

    -- Compute next trip number for this assignment
    SELECT COALESCE(MAX(trip_number), 0) + 1 INTO v_next_trip_num
    FROM public.trips
    WHERE assignment_id = p_assignment_id;

    -- Insert new active trip
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

    -- Update assignment status to in_progress
    UPDATE public.assignments
    SET status = 'in_progress',
        updated_at = now()
    WHERE id = p_assignment_id;

    -- Record assignment event
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

    RETURN jsonb_build_object(
        'success', true,
        'trip_id', v_trip_id,
        'trip_number', v_next_trip_num,
        'assignment_status', 'in_progress'
    );
END;
$$;

-- 7. Complete Trip RPC
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

    -- Update trip
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

    -- Update vehicle current odometer to the latest reading
    UPDATE public.vehicles
    SET current_odometer = GREATEST(current_odometer, p_end_odometer),
        updated_at = now()
    WHERE id = v_assignment.vehicle_id;

    -- Check if other trips are in progress
    SELECT COUNT(*) INTO v_open_trips_count
    FROM public.trips
    WHERE assignment_id = v_assignment.id
      AND status = 'in_progress';

    -- If final trip or no open trips left, complete the assignment
    IF p_is_final_trip_of_duty AND v_open_trips_count = 0 THEN
        UPDATE public.assignments
        SET status = 'completed',
            updated_at = now()
        WHERE id = v_assignment.id;
    END IF;

    -- Record assignment event
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

    RETURN jsonb_build_object(
        'success', true,
        'trip_id', p_trip_id,
        'distance_km', v_distance,
        'assignment_completed', (p_is_final_trip_of_duty AND v_open_trips_count = 0)
    );
END;
$$;

-- 8. Reassign Duty RPC (Owner / Dispatcher only)
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

    -- Update assignment
    UPDATE public.assignments
    SET driver_id = COALESCE(p_new_driver_id, driver_id),
        vehicle_id = COALESCE(p_new_vehicle_id, vehicle_id),
        status = 'scheduled',
        driver_confirmed_at = NULL,
        updated_by = auth.uid(),
        updated_at = now()
    WHERE id = p_assignment_id;

    -- Log Reassignment Event
    INSERT INTO public.assignment_events (
        assignment_id,
        event_type,
        performed_by,
        previous_driver_id,
        new_driver_id,
        previous_vehicle_id,
        new_vehicle_id,
        reason,
        metadata
    ) VALUES (
        p_assignment_id,
        'reassigned',
        auth.uid(),
        v_old_driver_id,
        COALESCE(p_new_driver_id, v_old_driver_id),
        v_old_vehicle_id,
        COALESCE(p_new_vehicle_id, v_old_vehicle_id),
        p_reason,
        jsonb_build_object('performed_by_role', v_user_role)
    );

    RETURN jsonb_build_object(
        'success', true,
        'assignment_id', p_assignment_id,
        'new_driver_id', COALESCE(p_new_driver_id, v_old_driver_id),
        'new_vehicle_id', COALESCE(p_new_vehicle_id, v_old_vehicle_id),
        'status', 'scheduled'
    );
END;
$$;
