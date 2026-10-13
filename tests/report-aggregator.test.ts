import { describe, it, expect } from 'vitest';
import {
  aggregateDriverReport,
  aggregateVehicleReport,
} from '@/lib/utils/report-aggregator';
import { Assignment, Driver, Route, Team, Trip, Vehicle } from '@/types/database';

describe('Report Aggregator', () => {
  const mockDriver: Driver = {
    id: 'drv-1',
    employee_code: 'EMP-1001',
    full_name: 'Test Driver',
    phone: '+919400112233',
    license_number: 'LIC1001',
    license_expiry: '2028-01-01',
    is_fixed_route: true,
    default_route_id: 'rt-1',
    status: 'active',
    notes: null,
    profile_id: null,
    created_at: '',
    updated_at: '',
  };

  const mockVehicle: Vehicle = {
    id: 'veh-1',
    registration_number: 'KL-07-CD-4101',
    make_model: 'Tata Starbus',
    vehicle_type: 'bus',
    capacity: 32,
    current_odometer: 100000,
    status: 'active',
    notes: null,
    created_at: '',
    updated_at: '',
  };

  const mockRoute: Route = {
    id: 'rt-1',
    code: 'RT-101',
    name: 'Test Corridor',
    origin: 'A',
    destination: 'B',
    planned_distance_km: 25,
    estimated_duration_minutes: 40,
    team_id: 'team-1',
    is_active: true,
    created_at: '',
    updated_at: '',
  };

  const mockTeam: Team = {
    id: 'team-1',
    name: 'Test Client Corp',
    contact_person: null,
    contact_phone: null,
    billing_notes: null,
    is_active: true,
    created_at: '',
    updated_at: '',
  };

  // 2 duties on the SAME date (morning and afternoon sequential duties)
  const mockAssignments: Assignment[] = [
    {
      id: 'assign-1',
      duty_date: '2026-10-15',
      driver_id: 'drv-1',
      vehicle_id: 'veh-1',
      route_id: 'rt-1',
      team_id: 'team-1',
      planned_start_time: '06:00',
      planned_end_time: '10:00',
      status: 'completed',
      driver_confirmed_at: '2026-10-15T05:30:00Z',
      notes: null,
      created_by: null,
      updated_by: null,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'assign-2',
      duty_date: '2026-10-15', // SAME DATE
      driver_id: 'drv-1',
      vehicle_id: 'veh-1',
      route_id: 'rt-1',
      team_id: 'team-1',
      planned_start_time: '14:00',
      planned_end_time: '18:00',
      status: 'completed',
      driver_confirmed_at: '2026-10-15T13:30:00Z',
      notes: null,
      created_by: null,
      updated_by: null,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'assign-3',
      duty_date: '2026-10-16', // SECOND DATE
      driver_id: 'drv-1',
      vehicle_id: 'veh-1',
      route_id: 'rt-1',
      team_id: 'team-1',
      planned_start_time: '08:00',
      planned_end_time: '12:00',
      status: 'completed',
      driver_confirmed_at: '2026-10-16T07:30:00Z',
      notes: null,
      created_by: null,
      updated_by: null,
      created_at: '',
      updated_at: '',
    },
  ];

  // 3 completed trips across these assignments
  const mockTrips: Trip[] = [
    {
      id: 'trip-1',
      assignment_id: 'assign-1',
      trip_number: 1,
      status: 'completed',
      start_time: '2026-10-15T06:15:00Z',
      end_time: '2026-10-15T07:30:00Z',
      start_odometer: 100000,
      end_odometer: 100030, // 30 km
      assigned_route_id: 'rt-1',
      actual_destination: null,
      driver_notes: null,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'trip-2',
      assignment_id: 'assign-2',
      trip_number: 1,
      status: 'completed',
      start_time: '2026-10-15T14:15:00Z',
      end_time: '2026-10-15T15:30:00Z',
      start_odometer: 100030,
      end_odometer: 100055, // 25 km
      assigned_route_id: 'rt-1',
      actual_destination: null,
      driver_notes: null,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'trip-3',
      assignment_id: 'assign-3',
      trip_number: 1,
      status: 'completed',
      start_time: '2026-10-16T08:15:00Z',
      end_time: '2026-10-16T09:30:00Z',
      start_odometer: 100055,
      end_odometer: 100100, // 45 km
      assigned_route_id: 'rt-1',
      actual_destination: null,
      driver_notes: null,
      created_at: '',
      updated_at: '',
    },
  ];

  it('aggregates distinct duty dates without inflation from multiple duties on the same day', () => {
    const report = aggregateDriverReport({
      assignments: mockAssignments,
      trips: mockTrips,
      drivers: [mockDriver],
      vehicles: [mockVehicle],
      routes: [mockRoute],
      teams: [mockTeam],
    });

    expect(report).toHaveLength(1);
    const d = report[0];
    // 3 duties across 2 distinct dates (2026-10-15 and 2026-10-16) -> must equal 2 duty days
    expect(d.assignedDutyDays).toBe(2);
    expect(d.completedTripsCount).toBe(3);
    // Total distance = 30 + 25 + 45 = 100 km
    expect(d.totalDistanceKm).toBe(100);
  });

  it('accurately aggregates vehicle deployments and distance', () => {
    const report = aggregateVehicleReport({
      assignments: mockAssignments,
      trips: mockTrips,
      drivers: [mockDriver],
      vehicles: [mockVehicle],
      routes: [mockRoute],
      teams: [mockTeam],
    });

    expect(report).toHaveLength(1);
    const v = report[0];
    expect(v.dutyDatesCount).toBe(2);
    expect(v.completedTripsCount).toBe(3);
    expect(v.totalDistanceKm).toBe(100);
  });
});
