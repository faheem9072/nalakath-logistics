-- =============================================================================
-- Migration 00004: Seed Data for FleetFlow
-- Realistic logistics fleet data (~10 vehicles, 8 drivers, 4 teams, 5 routes)
-- =============================================================================

-- Teams
INSERT INTO public.teams (id, name, contact_person, contact_phone, billing_notes)
VALUES
    ('11111111-1111-1111-1111-111111110001', 'Metro Tech Campus', 'Sunil Menon', '+919876543210', 'Monthly invoice due on 5th'),
    ('11111111-1111-1111-1111-111111110002', 'Apex Pharma Logistics', 'Dr. Farooq Ali', '+919876543211', 'Temperature control reporting required'),
    ('11111111-1111-1111-1111-111111110003', 'Seaport Cargo Operations', 'Capt. Varma', '+919876543212', 'Port entry passes renewed quarterly'),
    ('11111111-1111-1111-1111-111111110004', 'Global Retail Express', 'Aisha Khan', '+919876543213', 'Multi-drop distribution')
ON CONFLICT (name) DO NOTHING;

-- Routes
INSERT INTO public.routes (id, code, name, origin, destination, planned_distance_km, estimated_duration_minutes, team_id)
VALUES
    ('22222222-2222-2222-2222-222222220001', 'RT-NORTH-01', 'Depot to Tech Park Northern Loop', 'Central Terminal Depot', 'Infopark Phase 2', 42.50, 65, '11111111-1111-1111-1111-111111110001'),
    ('22222222-2222-2222-2222-222222220002', 'RT-CARGO-02', 'Airport Cargo to Seaport Link', 'Air Freight Terminal', 'Cochin Port Basin', 58.00, 90, '11111111-1111-1111-1111-111111110003'),
    ('22222222-2222-2222-2222-222222220003', 'RT-PHARMA-03', 'Cold Chain Distribution South', 'Apex Central Warehouse', 'General Hospital Hub', 34.00, 50, '11111111-1111-1111-1111-111111110002'),
    ('22222222-2222-2222-2222-222222220004', 'RT-EXPRESS-04', 'Downtown Metro Shuttle', 'North Metro Station', 'South Railway Junction', 18.50, 35, '11111111-1111-1111-1111-111111110004'),
    ('22222222-2222-2222-2222-222222220005', 'RT-SUBURB-05', 'Suburban Worker Express', 'Industrial Area Gate 1', 'Suburban Transit Hub', 27.20, 45, '11111111-1111-1111-1111-111111110001')
ON CONFLICT (code) DO NOTHING;

-- Vehicles
INSERT INTO public.vehicles (id, registration_number, make_model, vehicle_type, capacity, current_odometer, status, notes)
VALUES
    ('33333333-3333-3333-3333-333333330001', 'KL-07-CD-4101', 'Tata Starbus 32-Seater', 'bus', 32, 125430.00, 'active', 'Regular corporate service'),
    ('33333333-3333-3333-3333-333333330002', 'KL-07-CD-4102', 'Tata Starbus 32-Seater', 'bus', 32, 118200.50, 'active', 'Regular corporate service'),
    ('33333333-3333-3333-3333-333333330003', 'KL-07-CE-5201', 'Ashok Leyland Oyster 40S', 'bus', 40, 94310.00, 'active', 'High capacity shuttle'),
    ('33333333-3333-3333-3333-333333330004', 'KL-07-CF-6301', 'Force Traveller 17-Seater', 'mini_bus', 17, 76240.00, 'active', 'Airport crew transfers'),
    ('33333333-3333-3333-3333-333333330005', 'KL-07-CF-6302', 'Force Traveller 17-Seater', 'mini_bus', 17, 81050.00, 'active', 'Express route'),
    ('33333333-3333-3333-3333-333333330006', 'KL-07-CG-7401', 'Mahindra Bolero Maxi Truck', 'truck', 2, 64200.00, 'active', 'Cargo transfer'),
    ('33333333-3333-3333-3333-333333330007', 'KL-07-CH-8501', 'Eicher Pro 2049 Heavy Van', 'van', 3, 51340.00, 'maintenance', 'Scheduled 50k km engine overhaul'),
    ('33333333-3333-3333-3333-333333330008', 'KL-07-CH-8502', 'Toyota Innova Crysta', 'car', 7, 43200.00, 'active', 'Executive VIP client transfers')
ON CONFLICT (registration_number) DO NOTHING;

-- Drivers
INSERT INTO public.drivers (id, employee_code, full_name, phone, license_number, license_expiry, is_fixed_route, default_route_id, status)
VALUES
    ('44444444-4444-4444-4444-444444440001', 'EMP-1001', 'Rajesh K. Nair', '+919400112233', 'KL0720180004312', '2028-08-15', true, '22222222-2222-2222-2222-222222220001', 'active'),
    ('44444444-4444-4444-4444-444444440002', 'EMP-1002', 'Muhammed Shafeeq', '+919400223344', 'KL0720190005128', '2027-11-20', false, NULL, 'active'),
    ('44444444-4444-4444-4444-444444440003', 'EMP-1003', 'Anand V. Pillai', '+919400334455', 'KL0720170003982', '2029-03-10', true, '22222222-2222-2222-2222-222222220002', 'active'),
    ('44444444-4444-4444-4444-444444440004', 'EMP-1004', 'Suresh Babu M.', '+919400445566', 'KL0720200007812', '2027-04-18', false, NULL, 'active'),
    ('44444444-4444-4444-4444-444444440005', 'EMP-1005', 'Praveen Kurup', '+919400556677', 'KL0720160002901', '2028-12-05', false, NULL, 'active'),
    ('44444444-4444-4444-4444-444444440006', 'EMP-1006', 'Joby Thomas', '+919400667788', 'KL0720210009144', '2029-06-30', true, '22222222-2222-2222-2222-222222220004', 'active'),
    ('44444444-4444-4444-4444-444444440007', 'EMP-1007', 'Abdul Latheef', '+919400778899', 'KL0720150001889', '2026-09-12', false, NULL, 'on_leave'),
    ('44444444-4444-4444-4444-444444440008', 'EMP-1008', 'Manoj Kumar P.', '+919400889900', 'KL0720140000994', '2025-01-10', false, NULL, 'inactive')
ON CONFLICT (employee_code) DO NOTHING;

-- Sample Assignments for Current Operational View
INSERT INTO public.assignments (
    id, duty_date, driver_id, vehicle_id, route_id, team_id,
    planned_start_time, planned_end_time, status, driver_confirmed_at, notes
) VALUES
    (
        '55555555-5555-5555-5555-555555550001',
        CURRENT_DATE,
        '44444444-4444-4444-4444-444444440001',
        '33333333-3333-3333-3333-333333330001',
        '22222222-2222-2222-2222-222222220001',
        '11111111-1111-1111-1111-111111110001',
        '06:30:00',
        '10:30:00',
        'in_progress',
        now() - INTERVAL '3 hours',
        'Morning employee transit duty'
    ),
    (
        '55555555-5555-5555-5555-555555550002',
        CURRENT_DATE,
        '44444444-4444-4444-4444-444444440002',
        '33333333-3333-3333-3333-333333330002',
        '22222222-2222-2222-2222-222222220003',
        '11111111-1111-1111-1111-111111110002',
        '08:00:00',
        '12:00:00',
        'confirmed',
        now() - INTERVAL '1 hour',
        'Pharma cold supply distribution'
    ),
    (
        '55555555-5555-5555-5555-555555550003',
        CURRENT_DATE,
        '44444444-4444-4444-4444-444444440003',
        '33333333-3333-3333-3333-333333330003',
        '22222222-2222-2222-2222-222222220002',
        '11111111-1111-1111-1111-111111110003',
        '09:00:00',
        '14:00:00',
        'scheduled',
        NULL,
        'Pending driver confirmation'
    ),
    (
        '55555555-5555-5555-5555-555555550004',
        CURRENT_DATE,
        '44444444-4444-4444-4444-444444440004',
        '33333333-3333-3333-3333-333333330004',
        '22222222-2222-2222-2222-222222220004',
        '11111111-1111-1111-1111-111111110004',
        '14:00:00',
        '18:30:00',
        'scheduled',
        NULL,
        'Afternoon express link'
    )
ON CONFLICT (id) DO NOTHING;

-- Sample Trips for in_progress duty
INSERT INTO public.trips (
    id, assignment_id, trip_number, status, start_time, start_odometer,
    assigned_route_id, actual_destination, driver_notes
) VALUES
    (
        '66666666-6666-6666-6666-666666660001',
        '55555555-5555-5555-5555-555555550001',
        1,
        'in_progress',
        now() - INTERVAL '2 hours',
        125430.00,
        '22222222-2222-2222-2222-222222220001',
        'Infopark Phase 2',
        'Departed on schedule at 06:40 AM'
    )
ON CONFLICT (assignment_id, trip_number) DO NOTHING;
