-- =============================================================================
-- Migration 00003: Row Level Security (RLS) Policies
-- Strict role-based isolation: Owner, Dispatcher, Driver
-- =============================================================================

-- Enable Row Level Security on all exposed tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 1. PROFILES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Owners and dispatchers can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.get_current_user_role() IN ('owner', 'dispatcher'));

CREATE POLICY "Only owners can insert or update profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.get_current_user_role() = 'owner')
    WITH CHECK (public.get_current_user_role() = 'owner');

-- -----------------------------------------------------------------------------
-- 2. TEAMS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Staff can view teams"
    ON public.teams FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Owners and dispatchers can manage teams"
    ON public.teams FOR ALL
    TO authenticated
    USING (public.get_current_user_role() IN ('owner', 'dispatcher'))
    WITH CHECK (public.get_current_user_role() IN ('owner', 'dispatcher'));

-- -----------------------------------------------------------------------------
-- 3. ROUTES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Staff can view routes"
    ON public.routes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Owners and dispatchers can manage routes"
    ON public.routes FOR ALL
    TO authenticated
    USING (public.get_current_user_role() IN ('owner', 'dispatcher'))
    WITH CHECK (public.get_current_user_role() IN ('owner', 'dispatcher'));

-- -----------------------------------------------------------------------------
-- 4. VEHICLES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Staff can view vehicles"
    ON public.vehicles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Owners and dispatchers can manage vehicles"
    ON public.vehicles FOR ALL
    TO authenticated
    USING (public.get_current_user_role() IN ('owner', 'dispatcher'))
    WITH CHECK (public.get_current_user_role() IN ('owner', 'dispatcher'));

-- -----------------------------------------------------------------------------
-- 5. DRIVERS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Owners and dispatchers can view all drivers"
    ON public.drivers FOR SELECT
    TO authenticated
    USING (public.get_current_user_role() IN ('owner', 'dispatcher'));

CREATE POLICY "Drivers can view only their own driver profile"
    ON public.drivers FOR SELECT
    TO authenticated
    USING (
        id = public.get_current_driver_id()
    );

CREATE POLICY "Owners can manage drivers"
    ON public.drivers FOR ALL
    TO authenticated
    USING (public.get_current_user_role() = 'owner')
    WITH CHECK (public.get_current_user_role() = 'owner');

CREATE POLICY "Dispatchers can update driver status"
    ON public.drivers FOR UPDATE
    TO authenticated
    USING (public.get_current_user_role() = 'dispatcher')
    WITH CHECK (public.get_current_user_role() = 'dispatcher');

-- -----------------------------------------------------------------------------
-- 6. ASSIGNMENTS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Owners and dispatchers can view all assignments"
    ON public.assignments FOR SELECT
    TO authenticated
    USING (public.get_current_user_role() IN ('owner', 'dispatcher'));

CREATE POLICY "Drivers can view only their own assignments"
    ON public.assignments FOR SELECT
    TO authenticated
    USING (
        driver_id = public.get_current_driver_id()
    );

CREATE POLICY "Owners and dispatchers can create and modify assignments"
    ON public.assignments FOR ALL
    TO authenticated
    USING (public.get_current_user_role() IN ('owner', 'dispatcher'))
    WITH CHECK (public.get_current_user_role() IN ('owner', 'dispatcher'));

-- -----------------------------------------------------------------------------
-- 7. TRIPS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Owners and dispatchers can view all trips"
    ON public.trips FOR SELECT
    TO authenticated
    USING (public.get_current_user_role() IN ('owner', 'dispatcher'));

CREATE POLICY "Drivers can view only their own trips"
    ON public.trips FOR SELECT
    TO authenticated
    USING (
        assignment_id IN (
            SELECT a.id FROM public.assignments a
            WHERE a.driver_id = public.get_current_driver_id()
        )
    );

CREATE POLICY "Owners and dispatchers can manage trips"
    ON public.trips FOR ALL
    TO authenticated
    USING (public.get_current_user_role() IN ('owner', 'dispatcher'))
    WITH CHECK (public.get_current_user_role() IN ('owner', 'dispatcher'));

-- -----------------------------------------------------------------------------
-- 8. ASSIGNMENT EVENTS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Owners and dispatchers can view all assignment events"
    ON public.assignment_events FOR SELECT
    TO authenticated
    USING (public.get_current_user_role() IN ('owner', 'dispatcher'));

CREATE POLICY "Drivers can view events for their own assignments"
    ON public.assignment_events FOR SELECT
    TO authenticated
    USING (
        assignment_id IN (
            SELECT a.id FROM public.assignments a
            WHERE a.driver_id = public.get_current_driver_id()
        )
    );

CREATE POLICY "Authenticated users can insert assignment events"
    ON public.assignment_events FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 9. AUDIT LOGS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Owners and dispatchers can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.get_current_user_role() IN ('owner', 'dispatcher'));

CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);
