-- =============================================================================
-- Migration 00005: Driver Trip Flow and Trip Rules
-- Enforce Trip Rules at Database / Server Level:
-- (a) Driver has no open trip
-- (b) Vehicle has no open trip
-- (c) At least N hours have passed since driver's last End Trip (default 6h)
-- Emergency 1-tap "Allow now" override
-- =============================================================================

-- 1. Ensure allow_next_trip_override column on drivers
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS allow_next_trip_override BOOLEAN NOT NULL DEFAULT false;

-- 2. System Settings table for owner configurations
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.settings (key, value)
VALUES ('min_trip_interval_hours', '6')
ON CONFLICT (key) DO NOTHING;

-- 3. Stored function: Calculate Starting KM for a vehicle
CREATE OR REPLACE FUNCTION public.get_starting_km_for_vehicle(p_vehicle_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_last_end_km NUMERIC;
    v_initial_km NUMERIC;
    v_current_odo NUMERIC;
BEGIN
    -- 1. Look for last completed trip with end_odometer
    SELECT end_odometer INTO v_last_end_km
    FROM public.trips
    WHERE vehicle_id = p_vehicle_id
      AND end_odometer IS NOT NULL
      AND status = 'completed'
    ORDER BY end_time DESC NULLS LAST, updated_at DESC
    LIMIT 1;

    IF v_last_end_km IS NOT NULL THEN
        RETURN v_last_end_km;
    END IF;

    -- 2. First ever trip: use initial KM / current odometer from vehicles table
    SELECT current_odometer INTO v_current_odo
    FROM public.vehicles
    WHERE id = p_vehicle_id;

    RETURN COALESCE(v_current_odo, 0.0);
END;
$$;

-- 4. Stored function: Check Trip Eligibility
CREATE OR REPLACE FUNCTION public.check_trip_eligibility(
    p_driver_id UUID,
    p_vehicle_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_driver_open_trip UUID;
    v_vehicle_open_trip RECORD;
    v_override BOOLEAN;
    v_last_end_time TIMESTAMPTZ;
    v_min_hours NUMERIC;
    v_next_allowed TIMESTAMPTZ;
BEGIN
    -- Rule (a): Driver has no open trip
    SELECT id INTO v_driver_open_trip
    FROM public.trips
    WHERE driver_id = p_driver_id
      AND (status = 'in_progress' OR end_time IS NULL)
    LIMIT 1;

    IF v_driver_open_trip IS NOT NULL THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'You already have an active trip in progress. Please complete it first.'
        );
    END IF;

    -- Rule (b): Vehicle has no open trip
    SELECT t.id, d.full_name INTO v_vehicle_open_trip
    FROM public.trips t
    JOIN public.drivers d ON t.driver_id = d.id
    WHERE t.vehicle_id = p_vehicle_id
      AND (t.status = 'in_progress' OR t.end_time IS NULL)
    LIMIT 1;

    IF v_vehicle_open_trip.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'Vehicle is currently in use by driver ' || v_vehicle_open_trip.full_name || '. Please choose another vehicle.'
        );
    END IF;

    -- Rule (c): Rest Cooldown rule
    SELECT allow_next_trip_override INTO v_override
    FROM public.drivers
    WHERE id = p_driver_id;

    IF v_override IS TRUE THEN
        RETURN jsonb_build_object('allowed', true);
    END IF;

    SELECT end_time INTO v_last_end_time
    FROM public.trips
    WHERE driver_id = p_driver_id
      AND end_time IS NOT NULL
      AND status = 'completed'
    ORDER BY end_time DESC
    LIMIT 1;

    IF v_last_end_time IS NOT NULL THEN
        SELECT COALESCE(NULLIF(value, '')::numeric, 6.0) INTO v_min_hours
        FROM public.settings
        WHERE key = 'min_trip_interval_hours';

        IF v_min_hours IS NULL THEN
            v_min_hours := 6.0;
        END IF;

        v_next_allowed := v_last_end_time + (v_min_hours || ' hours')::interval;

        IF now() < v_next_allowed THEN
            RETURN jsonb_build_object(
                'allowed', false,
                'reason', 'Your last trip ended at ' || to_char(v_last_end_time, 'FMHH12:MI AM') ||
                          '. Next trip can start after ' || to_char(v_next_allowed, 'FMHH12:MI AM') || '.'
            );
        END IF;
    END IF;

    RETURN jsonb_build_object('allowed', true);
END;
$$;

-- 5. Enhanced Start Trip function enforcing rules at DB level
CREATE OR REPLACE FUNCTION public.start_trip_v2(
    p_driver_id UUID,
    p_vehicle_id UUID,
    p_destination TEXT DEFAULT 'Route in progress',
    p_notes TEXT DEFAULT NULL,
    p_start_location JSONB DEFAULT '{"no_location": true}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_eligibility JSONB;
    v_starting_km NUMERIC;
    v_trip_id UUID;
    v_next_trip_num INT;
BEGIN
    -- Check eligibility
    v_eligibility := public.check_trip_eligibility(p_driver_id, p_vehicle_id);
    IF (v_eligibility->>'allowed')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION '%', (v_eligibility->>'reason');
    END IF;

    -- Reset single-use override
    UPDATE public.drivers
    SET allow_next_trip_override = false,
        updated_at = now()
    WHERE id = p_driver_id;

    -- Auto-fill starting KM from vehicle's previous ending KM (or initial KM)
    v_starting_km := public.get_starting_km_for_vehicle(p_vehicle_id);

    SELECT COALESCE(MAX(trip_number), 0) + 1 INTO v_next_trip_num
    FROM public.trips
    WHERE vehicle_id = p_vehicle_id;

    INSERT INTO public.trips (
        trip_number,
        driver_id,
        vehicle_id,
        status,
        start_time,
        start_odometer,
        actual_destination,
        driver_notes,
        created_at,
        updated_at
    ) VALUES (
        v_next_trip_num,
        p_driver_id,
        p_vehicle_id,
        'in_progress',
        now(),
        v_starting_km,
        p_destination,
        p_notes,
        now(),
        now()
    ) RETURNING id INTO v_trip_id;

    UPDATE public.vehicles
    SET current_odometer = GREATEST(current_odometer, v_starting_km),
        updated_at = now()
    WHERE id = p_vehicle_id;

    RETURN jsonb_build_object(
        'success', true,
        'trip_id', v_trip_id,
        'start_odometer', v_starting_km,
        'status', 'in_progress'
    );
END;
$$;
