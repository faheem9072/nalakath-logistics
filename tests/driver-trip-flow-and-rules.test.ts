import { describe, it, expect, beforeEach } from 'vitest';
import { dataRepo } from '@/lib/data-service';

describe('Part 2: Driver Trip Flow and Trip Rules Enforcement', () => {
  it('auto-fills Starting KM from last ending KM, or initial KM for first ever trip', async () => {
    const vehicles = await dataRepo.getVehicles();
    const drivers = await dataRepo.getDrivers();

    // 1. Vehicle with prior trip (KL 84 B 3057)
    const veh1 = vehicles.find((v) => v.registration_number.includes('3057')) || vehicles[0];
    const startingKm = dataRepo.getStartingKmForVehicle(veh1.id);
    expect(startingKm).toBeGreaterThan(0);

    // 2. Add a brand new vehicle with initial KM set by owner
    const newVeh = await dataRepo.createVehicle({
      registration_number: `KL-07-TEST-${Date.now().toString().slice(-4)}`,
      make_model: 'Tata Ace Gold EV',
      company: 'Delhivery',
      initial_km: 12500,
      vehicle_type: 'truck',
    });

    // Brand new vehicle has no trips yet -> must use initial KM
    const firstTripKm = dataRepo.getStartingKmForVehicle(newVeh.id);
    expect(firstTripKm).toBe(12500);

    // Clean up
    await dataRepo.archiveVehicle(newVeh.id);
  });

  it('rejects End Trip if ending KM is not strictly greater than starting KM', async () => {
    const drivers = await dataRepo.getDrivers();
    const vehicles = await dataRepo.getVehicles();

    const driver = drivers.find((d) => d.status === 'idle') || drivers[0];
    const vehicle = vehicles.find((v) => v.status === 'idle') || vehicles[0];

    // Ensure driver has override if in cooldown
    await dataRepo.allowDriverOverride(driver.id);

    const startKm = dataRepo.getStartingKmForVehicle(vehicle.id);
    const trip = await dataRepo.startTripForDriver({
      driverPhoneOrId: driver.id,
      vehicleId: vehicle.id,
      startOdometer: startKm,
      destination: 'Rule Test Run',
    });

    // 1. Try ending with KM less than start KM -> must fail
    await expect(
      dataRepo.completeTrip({
        tripId: trip.id,
        endOdometer: startKm - 5,
      })
    ).rejects.toThrow(/must be greater than Starting KM/);

    // 2. Try ending with KM EQUAL to start KM -> must fail
    await expect(
      dataRepo.completeTrip({
        tripId: trip.id,
        endOdometer: startKm,
      })
    ).rejects.toThrow(/must be greater than Starting KM/);

    // 3. Try ending with KM strictly greater -> must succeed
    const res = await dataRepo.completeTrip({
      tripId: trip.id,
      endOdometer: startKm + 18.5,
    });
    expect(res.distanceKm).toBe(18.5);
  });

  it('Rule (a): blocks a driver from starting a trip if they already have an open trip', async () => {
    const drivers = await dataRepo.getDrivers();
    const vehicles = await dataRepo.getVehicles();

    // Pick two idle vehicles
    const idleVehicles = vehicles.filter((v) => v.status === 'idle');
    const v1 = idleVehicles[0];
    const v2 = idleVehicles[1];
    const driver = drivers.find((d) => d.status === 'idle') || drivers[0];

    await dataRepo.allowDriverOverride(driver.id);

    const trip1 = await dataRepo.startTripForDriver({
      driverPhoneOrId: driver.id,
      vehicleId: v1.id,
      startOdometer: dataRepo.getStartingKmForVehicle(v1.id),
      destination: 'First Open Trip',
    });

    // Driver tries to start second trip on v2 -> must be blocked
    await expect(
      dataRepo.startTripForDriver({
        driverPhoneOrId: driver.id,
        vehicleId: v2.id,
        startOdometer: dataRepo.getStartingKmForVehicle(v2.id),
        destination: 'Second Trip Attempt',
      })
    ).rejects.toThrow(/already have an active trip in progress/);

    // Complete trip1
    const startKm1 = dataRepo.getStartingKmForVehicle(v1.id);
    await dataRepo.completeTrip({
      tripId: trip1.id,
      endOdometer: startKm1 + 10,
    });
  });

  it('Rule (b): blocks a vehicle that is already on a trip with another driver', async () => {
    const drivers = await dataRepo.getDrivers();
    const vehicles = await dataRepo.getVehicles();

    const d1 = drivers[0];
    const d2 = drivers[1];
    const sharedVeh = vehicles.find((v) => v.status === 'idle') || vehicles[0];

    await dataRepo.allowDriverOverride(d1.id);
    await dataRepo.allowDriverOverride(d2.id);

    // Driver 1 starts trip on shared vehicle
    const trip1 = await dataRepo.startTripForDriver({
      driverPhoneOrId: d1.id,
      vehicleId: sharedVeh.id,
      startOdometer: dataRepo.getStartingKmForVehicle(sharedVeh.id),
      destination: 'Driver 1 Run',
    });

    // Driver 2 tries to start trip on the same vehicle -> must be blocked
    await expect(
      dataRepo.startTripForDriver({
        driverPhoneOrId: d2.id,
        vehicleId: sharedVeh.id,
        startOdometer: dataRepo.getStartingKmForVehicle(sharedVeh.id),
        destination: 'Driver 2 Conflicting Run',
      })
    ).rejects.toThrow(/Vehicle is currently in use by driver/);

    // Complete driver 1's trip
    const startKm = dataRepo.getStartingKmForVehicle(sharedVeh.id);
    await dataRepo.completeTrip({
      tripId: trip1.id,
      endOdometer: startKm + 12,
    });
  });

  it('Rule (c): enforces Rest Cooldown rule and owner "Allow now" single-use emergency override', async () => {
    const drivers = await dataRepo.getDrivers();
    const vehicles = await dataRepo.getVehicles();

    const driver = drivers[2];
    const vehicle = vehicles.find((v) => v.status === 'idle') || vehicles[1];

    // Ensure driver starts clean
    await dataRepo.allowDriverOverride(driver.id);

    // Driver starts and completes a trip right now
    const startKm = dataRepo.getStartingKmForVehicle(vehicle.id);
    const trip = await dataRepo.startTripForDriver({
      driverPhoneOrId: driver.id,
      vehicleId: vehicle.id,
      startOdometer: startKm,
      destination: 'Rest Cooldown Test',
    });

    await dataRepo.completeTrip({
      tripId: trip.id,
      endOdometer: startKm + 25,
    });

    // Driver tries to start another trip immediately -> MUST BE BLOCKED BY REST COOLDOWN
    const cooldownCheck = dataRepo.checkDriverRestCooldown(driver.id);
    expect(cooldownCheck.allowed).toBe(false);
    expect(cooldownCheck.reason).toMatch(/Your last trip ended at .* Next trip can start after/);

    await expect(
      dataRepo.startTripForDriver({
        driverPhoneOrId: driver.id,
        vehicleId: vehicle.id,
        startOdometer: startKm + 25,
        destination: 'Immediate Re-trip Attempt',
      })
    ).rejects.toThrow(/Your last trip ended at .* Next trip can start after/);

    // OWNER TAPS "ALLOW NOW" (EMERGENCY OVERRIDE)
    await dataRepo.allowDriverOverride(driver.id);

    // Cooldown check is now allowed
    const overrideCheck = dataRepo.checkDriverRestCooldown(driver.id);
    expect(overrideCheck.allowed).toBe(true);

    // Driver can now start trip
    const leg2 = await dataRepo.startTripForDriver({
      driverPhoneOrId: driver.id,
      vehicleId: vehicle.id,
      startOdometer: startKm + 25,
      destination: 'Emergency Override Trip',
    });

    expect(leg2.status).toBe('in_progress');

    // Clean up
    await dataRepo.completeTrip({
      tripId: leg2.id,
      endOdometer: startKm + 35,
    });
  });

  it('allows logging expenses while trip is running and upon ending trip', async () => {
    const drivers = await dataRepo.getDrivers();
    const vehicles = await dataRepo.getVehicles();

    const driver = drivers[3];
    const vehicle = vehicles.find((v) => v.status === 'idle') || vehicles[0];

    await dataRepo.allowDriverOverride(driver.id);

    const startKm = dataRepo.getStartingKmForVehicle(vehicle.id);
    const trip = await dataRepo.startTripForDriver({
      driverPhoneOrId: driver.id,
      vehicleId: vehicle.id,
      startOdometer: startKm,
      destination: 'Expense Test Run',
    });

    // 1. Add expense while trip is running
    const runningExp = await dataRepo.createExpense({
      tripId: trip.id,
      vehicle_id: vehicle.id,
      driver_id: driver.id,
      expense_type: 'Fuel',
      amount: 1200,
      litres: 12.5,
      note: 'HP Petrol Pump Mid-trip',
    });
    expect(runningExp.amount).toBe(1200);
    expect(runningExp.trip_id).toBe(trip.id);

    // 2. End trip and add another expense in End Trip modal
    await dataRepo.completeTrip({
      tripId: trip.id,
      endOdometer: startKm + 20,
      expenses: [
        {
          expense_type: 'Toll',
          amount: 85,
          note: 'Paliyekkara Toll Plaza',
        },
      ],
    });

    // Verify driver expenses contain both
    const driverExpenses = await dataRepo.getDriverExpenses(driver.id);
    const tripExp = driverExpenses.filter((e) => e.trip_id === trip.id);
    expect(tripExp.length).toBe(2);
    expect(tripExp.some((e) => e.expense_type === 'Fuel' && e.amount === 1200)).toBe(true);
    expect(tripExp.some((e) => e.expense_type === 'Toll' && e.amount === 85)).toBe(true);
  });

  it('works when location permission is denied and flags trip with no location', async () => {
    const drivers = await dataRepo.getDrivers();
    const vehicles = await dataRepo.getVehicles();

    const driver = drivers[0];
    const vehicle = vehicles.find((v) => v.status === 'idle') || vehicles[0];

    await dataRepo.allowDriverOverride(driver.id);

    const startKm = dataRepo.getStartingKmForVehicle(vehicle.id);

    // Start trip with null location (location denied)
    const trip = await dataRepo.startTripForDriver({
      driverPhoneOrId: driver.id,
      vehicleId: vehicle.id,
      startOdometer: startKm,
      destination: 'No Location Trip',
      startLocation: null,
    });

    expect(trip).toBeDefined();
    expect(trip.status).toBe('in_progress');

    // End trip with null location
    await dataRepo.completeTrip({
      tripId: trip.id,
      endOdometer: startKm + 15,
      endLocation: null,
    });

    // Verify trip has no_location flag
    const allTrips = await dataRepo.getTrips();
    const saved = allTrips.find((t) => t.id === trip.id);
    expect(saved).toBeDefined();

    let parsedStartLoc: any = saved?.start_location;
    if (typeof parsedStartLoc === 'string') parsedStartLoc = JSON.parse(parsedStartLoc);
    expect(parsedStartLoc?.no_location).toBe(true);
  });
});
