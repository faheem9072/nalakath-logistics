import { describe, it, expect } from 'vitest';
import { dataRepo } from '@/lib/data-service';

describe('Driver Portal Direct Punch-In & Maintenance Logging', () => {
  it('starts a trip directly for any driver with starting kilometer and updates vehicle meter', async () => {
    const drivers = await dataRepo.getDrivers();
    const vehicles = await dataRepo.getVehicles();

    const testDriver = drivers[1]; // e.g. Haneefa
    const testVehicle = vehicles[0]; // KL 84 B 3057

    const startKm = testVehicle.current_odometer + 10;

    const trip = await dataRepo.startTripForDriver({
      driverPhoneOrId: testDriver.phone,
      vehicleId: testVehicle.id,
      startOdometer: startKm,
      destination: 'Mavoor Hub Corridor',
      notes: 'Morning express dispatch',
    });

    expect(trip).toBeDefined();
    expect(trip.status).toBe('in_progress');
    expect(trip.start_odometer).toBe(startKm);
    expect(trip.actual_destination).toBe('Mavoor Hub Corridor');

    // Verify vehicle meter synced
    const updatedVehicles = await dataRepo.getVehicles();
    const updatedVeh = updatedVehicles.find((v) => v.id === testVehicle.id);
    expect(updatedVeh?.current_odometer).toBeGreaterThanOrEqual(startKm);
    expect(updatedVeh?.status).toBe('active');
  });

  it('allows completing a trip and starting an extra leg without completed-status block', async () => {
    const drivers = await dataRepo.getDrivers();
    const vehicles = await dataRepo.getVehicles();
    const driver = drivers[2]; // Firoz
    const vehicle = vehicles[1];

    const startKm1 = vehicle.current_odometer + 5;
    const trip1 = await dataRepo.startTripForDriver({
      driverPhoneOrId: driver.phone,
      vehicleId: vehicle.id,
      startOdometer: startKm1,
      destination: 'Leg 1 Delivery',
    });

    // Complete Trip 1 as final trip
    const endKm1 = startKm1 + 42.5;
    const completed1 = await dataRepo.completeTrip({
      tripId: trip1.id,
      endOdometer: endKm1,
      isFinalTripOfDuty: true,
    });
    expect(completed1.distanceKm).toBe(42.5);

    // Now driver starts Leg 2 (should NOT throw error even though duty was marked completed)
    const startKm2 = endKm1;
    const trip2 = await dataRepo.startTripForDriver({
      driverPhoneOrId: driver.phone,
      vehicleId: vehicle.id,
      startOdometer: startKm2,
      destination: 'Leg 2 Extra Run',
    });

    expect(trip2).toBeDefined();
    expect(trip2.status).toBe('in_progress');
    expect(trip2.trip_number).toBeGreaterThanOrEqual(2);
  });

  it('records vehicle maintenance with issue type, amount, workshop and reflects in expenses', async () => {
    const vehicles = await dataRepo.getVehicles();
    const targetVeh = vehicles[0];

    const maintExpense = await dataRepo.recordMaintenance({
      vehicle_id: targetVeh.id,
      amount: 1450,
      issue_type: 'Tyre Puncture / Replace',
      workshop_name: 'Metro Tyre Works Calicut',
      set_vehicle_maintenance_status: false,
    });

    expect(maintExpense).toBeDefined();
    expect(maintExpense.amount).toBe(1450);
    expect(maintExpense.expense_type).toBe('Maintenance');
    expect(maintExpense.note).toContain('Tyre Puncture');
    expect(maintExpense.note).toContain('Metro Tyre Works Calicut');

    // Verify it appears in vehicle expenses report
    const rawReport = await dataRepo.getReportRawData();
    const foundExp = rawReport.expenses.find((e) => e.id === maintExpense.id);
    expect(foundExp).toBeDefined();
  });
});
