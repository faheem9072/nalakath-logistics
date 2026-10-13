import { Assignment, Driver, Vehicle } from '@/types/database';

export interface ConflictCheckParams {
  assignmentId?: string; // If editing existing
  dutyDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  driverId: string;
  vehicleId: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflictType?: 'driver_overlap' | 'vehicle_overlap' | 'vehicle_maintenance' | 'driver_unavailable';
  message?: string;
  conflictingAssignment?: Assignment;
}

/**
 * Checks if two time ranges [startA, endA] and [startB, endB] on the same day overlap.
 * Times formatted as HH:MM or HH:MM:SS
 */
export function doTimesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const normAStart = startA.slice(0, 5);
  const normAEnd = endA.slice(0, 5);
  const normBStart = startB.slice(0, 5);
  const normBEnd = endB.slice(0, 5);

  return normAStart < normBEnd && normAEnd > normBStart;
}

/**
 * Validates driver and vehicle availability against active assignments and statuses.
 */
export function checkScheduleConflicts(
  params: ConflictCheckParams,
  existingAssignments: Assignment[],
  driversMap: Map<string, Driver>,
  vehiclesMap: Map<string, Vehicle>
): ConflictResult {
  const vehicle = vehiclesMap.get(params.vehicleId);
  const driver = driversMap.get(params.driverId);

  // 1. Vehicle status check
  if (vehicle) {
    if (vehicle.status === 'maintenance') {
      return {
        hasConflict: true,
        conflictType: 'vehicle_maintenance',
        message: `Vehicle ${vehicle.registration_number} is currently in MAINTENANCE and cannot be assigned.`,
      };
    }
    if (vehicle.status === 'inactive') {
      return {
        hasConflict: true,
        conflictType: 'vehicle_maintenance',
        message: `Vehicle ${vehicle.registration_number} is marked INACTIVE.`,
      };
    }
  }

  // 2. Driver status check
  if (driver) {
    if (driver.status !== 'active') {
      return {
        hasConflict: true,
        conflictType: 'driver_unavailable',
        message: `Driver ${driver.full_name} is currently ${driver.status.toUpperCase()} and cannot be assigned.`,
      };
    }
  }

  // 3. Check for overlapping duties on the same duty date
  for (const existing of existingAssignments) {
    // Ignore current assignment if editing
    if (params.assignmentId && existing.id === params.assignmentId) {
      continue;
    }

    // Ignore cancelled or reassigned duties
    if (existing.status === 'cancelled' || existing.status === 'reassigned') {
      continue;
    }

    // Must be the same duty date to conflict
    if (existing.duty_date !== params.dutyDate) {
      continue;
    }

    // Check if times overlap
    const overlaps = doTimesOverlap(
      params.startTime,
      params.endTime,
      existing.planned_start_time,
      existing.planned_end_time
    );

    if (overlaps) {
      // Driver overlap conflict
      if (existing.driver_id === params.driverId) {
        const dName = driver?.full_name || 'Driver';
        return {
          hasConflict: true,
          conflictType: 'driver_overlap',
          message: `Schedule Conflict: ${dName} is already assigned to a duty on ${params.dutyDate} (${existing.planned_start_time.slice(0, 5)} - ${existing.planned_end_time.slice(0, 5)}).`,
          conflictingAssignment: existing,
        };
      }

      // Vehicle overlap conflict
      if (existing.vehicle_id === params.vehicleId) {
        const vReg = vehicle?.registration_number || 'Vehicle';
        return {
          hasConflict: true,
          conflictType: 'vehicle_overlap',
          message: `Schedule Conflict: Vehicle ${vReg} is already allocated on ${params.dutyDate} (${existing.planned_start_time.slice(0, 5)} - ${existing.planned_end_time.slice(0, 5)}).`,
          conflictingAssignment: existing,
        };
      }
    }
  }

  return { hasConflict: false };
}
