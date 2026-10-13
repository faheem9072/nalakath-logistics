import { describe, it, expect } from 'vitest';
import {
  checkScheduleConflicts,
  doTimesOverlap,
} from '@/lib/utils/conflict-detector';
import { Assignment, Driver, Vehicle } from '@/types/database';

describe('Schedule Conflict Detector', () => {
  const mockDrivers: Driver[] = [
    {
      id: 'drv-1',
      employee_code: 'EMP-01',
      full_name: 'Driver Active',
      phone: '+919999999991',
      license_number: 'LIC01',
      license_expiry: '2028-01-01',
      is_fixed_route: false,
      default_route_id: null,
      status: 'active',
      notes: null,
      profile_id: null,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'drv-2',
      employee_code: 'EMP-02',
      full_name: 'Driver Inactive',
      phone: '+919999999992',
      license_number: 'LIC02',
      license_expiry: '2028-01-01',
      is_fixed_route: false,
      default_route_id: null,
      status: 'inactive',
      notes: null,
      profile_id: null,
      created_at: '',
      updated_at: '',
    },
  ];

  const mockVehicles: Vehicle[] = [
    {
      id: 'veh-1',
      registration_number: 'KL-07-AA-1001',
      make_model: 'Tata Starbus',
      vehicle_type: 'bus',
      capacity: 32,
      current_odometer: 10000,
      status: 'active',
      notes: null,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'veh-2',
      registration_number: 'KL-07-AA-1002',
      make_model: 'Force Traveller',
      vehicle_type: 'mini_bus',
      capacity: 17,
      current_odometer: 15000,
      status: 'maintenance',
      notes: null,
      created_at: '',
      updated_at: '',
    },
  ];

  const driversMap = new Map(mockDrivers.map((d) => [d.id, d]));
  const vehiclesMap = new Map(mockVehicles.map((v) => [v.id, v]));

  const existingAssignments: Assignment[] = [
    {
      id: 'assign-existing-1',
      duty_date: '2026-10-15',
      driver_id: 'drv-1',
      vehicle_id: 'veh-1',
      route_id: null,
      team_id: null,
      planned_start_time: '08:00',
      planned_end_time: '12:00',
      status: 'scheduled',
      driver_confirmed_at: null,
      notes: null,
      created_by: null,
      updated_by: null,
      created_at: '',
      updated_at: '',
    },
  ];

  it('detects overlapping time intervals correctly', () => {
    // 08:00-12:00 vs 09:00-13:00 (overlap)
    expect(doTimesOverlap('08:00', '12:00', '09:00', '13:00')).toBe(true);
    // 08:00-12:00 vs 07:00-09:00 (overlap)
    expect(doTimesOverlap('08:00', '12:00', '07:00', '09:00')).toBe(true);
    // 08:00-12:00 vs 12:00-16:00 (adjacent sequential duties - NO overlap)
    expect(doTimesOverlap('08:00', '12:00', '12:00', '16:00')).toBe(false);
    // 08:00-12:00 vs 13:00-17:00 (distinct duties - NO overlap)
    expect(doTimesOverlap('08:00', '12:00', '13:00', '17:00')).toBe(false);
  });

  it('blocks assigning a vehicle currently under maintenance', () => {
    const res = checkScheduleConflicts(
      {
        dutyDate: '2026-10-15',
        startTime: '13:00',
        endTime: '17:00',
        driverId: 'drv-1',
        vehicleId: 'veh-2', // maintenance
      },
      [],
      driversMap,
      vehiclesMap
    );

    expect(res.hasConflict).toBe(true);
    expect(res.conflictType).toBe('vehicle_maintenance');
  });

  it('blocks assigning an inactive driver', () => {
    const res = checkScheduleConflicts(
      {
        dutyDate: '2026-10-15',
        startTime: '13:00',
        endTime: '17:00',
        driverId: 'drv-2', // inactive
        vehicleId: 'veh-1',
      },
      [],
      driversMap,
      vehiclesMap
    );

    expect(res.hasConflict).toBe(true);
    expect(res.conflictType).toBe('driver_unavailable');
  });

  it('detects driver conflict when driver is already allocated during overlapping hours', () => {
    const res = checkScheduleConflicts(
      {
        dutyDate: '2026-10-15',
        startTime: '10:00',
        endTime: '14:00', // overlaps with 08:00-12:00
        driverId: 'drv-1',
        vehicleId: 'veh-1',
      },
      existingAssignments,
      driversMap,
      vehiclesMap
    );

    expect(res.hasConflict).toBe(true);
    expect(res.conflictType).toBe('driver_overlap');
  });

  it('permits legitimate sequential duties on the same day for the same driver and vehicle', () => {
    const res = checkScheduleConflicts(
      {
        dutyDate: '2026-10-15',
        startTime: '13:00',
        endTime: '17:00', // distinct afternoon duty
        driverId: 'drv-1',
        vehicleId: 'veh-1',
      },
      existingAssignments,
      driversMap,
      vehiclesMap
    );

    expect(res.hasConflict).toBe(false);
  });
});
