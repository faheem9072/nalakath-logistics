import { describe, it, expect, beforeEach } from 'vitest';
import { dataRepo } from '@/lib/data-service';

describe('Fleet Operations State Machine & Multi-Trip Workflows', () => {
  let testAssignmentId: string;
  let testDayOffset = 10;

  beforeEach(async () => {
    testDayOffset++;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + testDayOffset);
    const dateStr = targetDate.toISOString().split('T')[0];

    const vehicles = await dataRepo.getVehicles();
    const drivers = await dataRepo.getDrivers();

    const created = await dataRepo.createAssignment({
      duty_date: dateStr,
      driver_id: drivers[0].id,
      vehicle_id: vehicles[0].id,
      planned_start_time: '08:00',
      planned_end_time: '14:00',
      notes: 'State machine automated test duty',
    });

    testAssignmentId = created.id;
  });

  it('allows driver confirmation and transitions status to confirmed', async () => {
    const confirmed = await dataRepo.confirmDuty(testAssignmentId);
    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.driver_confirmed_at).not.toBeNull();
  });

  it('supports starting and completing multiple trips under one duty allocation', async () => {
    await dataRepo.confirmDuty(testAssignmentId);

    // Trip 1
    const trip1 = await dataRepo.startTrip({
      assignmentId: testAssignmentId,
      startOdometer: 120000,
      actualDestination: 'Waypoint A',
      notes: 'Leg 1 departed',
    });

    expect(trip1.trip_number).toBe(1);
    expect(trip1.status).toBe('in_progress');

    // Complete Trip 1 (NOT final trip)
    const completed1 = await dataRepo.completeTrip({
      tripId: trip1.id,
      endOdometer: 120035.5,
      isFinalTripOfDuty: false,
    });

    expect(completed1.distanceKm).toBe(35.5);
    expect(completed1.trip.status).toBe('completed');

    // Verify assignment remains in progress for next trip
    let currentAssign = await dataRepo.getAssignmentById(testAssignmentId);
    expect(currentAssign?.status).toBe('in_progress');

    // Trip 2 (Second leg under same duty allocation)
    const trip2 = await dataRepo.startTrip({
      assignmentId: testAssignmentId,
      startOdometer: 120035.5,
      actualDestination: 'Return to Terminal',
      notes: 'Leg 2 return journey',
    });

    expect(trip2.trip_number).toBe(2);
    expect(trip2.status).toBe('in_progress');

    // Complete Trip 2 as final trip of duty
    const completed2 = await dataRepo.completeTrip({
      tripId: trip2.id,
      endOdometer: 120072.0,
      isFinalTripOfDuty: true,
    });

    expect(completed2.distanceKm).toBe(36.5);
    expect(completed2.trip.status).toBe('completed');

    // Verify assignment is now completed
    currentAssign = await dataRepo.getAssignmentById(testAssignmentId);
    expect(currentAssign?.status).toBe('completed');
  });

  it('reassigns duty, resets confirmation, and records audit trail', async () => {
    const drivers = await dataRepo.getDrivers();
    const otherDriver = drivers[1];

    const reassigned = await dataRepo.reassignAssignment({
      assignmentId: testAssignmentId,
      newDriverId: otherDriver.id,
      reason: 'Driver sickness replacement',
    });

    expect(reassigned.driver_id).toBe(otherDriver.id);
    expect(reassigned.status).toBe('scheduled');
    expect(reassigned.driver_confirmed_at).toBeNull();

    // Verify event timeline recorded
    const events = await dataRepo.getAssignmentEvents();
    const reassignEvent = events.find(
      (e) => e.assignment_id === testAssignmentId && e.event_type === 'reassigned'
    );

    expect(reassignEvent).toBeDefined();
    expect(reassignEvent?.reason).toBe('Driver sickness replacement');
  });
});
