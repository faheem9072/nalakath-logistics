import { describe, it, expect } from 'vitest';
import { dataRepo } from '@/lib/data-service';

describe('Part 4: Owner Full Edit Control', () => {
  const TEST_MONTH = '2026-10';

  // =========================================================================
  // 1. DRIVERS
  // =========================================================================
  describe('1. DRIVERS Edit Control', () => {
    it('creates a new driver with unique ID and default status', async () => {
      const uniqueSuffix = Date.now().toString().slice(-4);
      const newDriver = await dataRepo.createDriver({
        fullName: `Test Driver ${uniqueSuffix}`,
        phone: `+91 98950 ${uniqueSuffix}`,
        pin: '4321',
      });

      expect(newDriver.id).toBeTruthy();
      expect(newDriver.full_name).toBe(`Test Driver ${uniqueSuffix}`);
      expect(newDriver.phone.replace(/\D/g, '')).toContain(uniqueSuffix);
      expect(newDriver.pin).toBe('4321');
      expect(newDriver.is_active).toBe(true);
    });

    it('edits driver name, mobile number, PIN, and active status using unique ID without duplicating', async () => {
      const driversBefore = await dataRepo.getDrivers();
      const targetDriver = driversBefore[0];
      const countBefore = driversBefore.length;

      const updatedName = `${targetDriver.full_name} Edited`;
      const updatedPhone = '9847012345';
      const updatedPin = '9999';

      const updated = await dataRepo.updateDriver(targetDriver.id, {
        full_name: updatedName,
        phone: updatedPhone,
        pin: updatedPin,
        is_active: false,
      });

      expect(updated.id).toBe(targetDriver.id);
      expect(updated.full_name).toBe(updatedName);
      expect(updated.phone).toBe(updatedPhone);
      expect(updated.pin).toBe(updatedPin);
      expect(updated.is_active).toBe(false);

      // Verify no duplicate driver record was created
      const driversAfter = await dataRepo.getDrivers();
      expect(driversAfter.length).toBe(countBefore);

      // Restore active status
      await dataRepo.updateDriver(targetDriver.id, {
        full_name: targetDriver.full_name,
        phone: targetDriver.phone,
        pin: targetDriver.pin || '1234',
        is_active: true,
      });
    });

    it('archives a driver while strictly keeping their past trips', async () => {
      const drivers = await dataRepo.getDrivers();
      const driver = drivers[0];

      // Fetch trips before archiving
      const summaryBefore = await dataRepo.getDriverMonthlySummary(driver.id, TEST_MONTH);
      const tripCountBefore = summaryBefore.tripDetails.length;

      // Archive driver
      await dataRepo.archiveDriver(driver.id);

      const driversAfter = await dataRepo.getDrivers();
      const archivedDriver = driversAfter.find((d) => d.id === driver.id);
      expect(archivedDriver?.is_active).toBe(false);

      // Verify past trips are preserved
      const summaryAfter = await dataRepo.getDriverMonthlySummary(driver.id, TEST_MONTH);
      expect(summaryAfter.tripDetails.length).toBe(tripCountBefore);

      // Restore active status
      await dataRepo.updateDriver(driver.id, { is_active: true });
    });
  });

  // =========================================================================
  // 2. VEHICLES
  // =========================================================================
  describe('2. VEHICLES Edit Control', () => {
    it('creates a new vehicle with registration, model, company, initial KM', async () => {
      const uniqueSuffix = Date.now().toString().slice(-4);
      const reg = `KL-11-TEST-${uniqueSuffix}`;

      const newVeh = await dataRepo.createVehicle({
        registration_number: reg,
        make_model: 'Tata Ace Gold',
        company: 'Delhivery',
        route_location: 'Calicut City Hub',
        vehicle_type: 'truck',
        capacity: 2,
        initial_km: 12000,
        current_odometer: 12000,
        status: 'active',
        notes: 'Owner test vehicle',
      });

      expect(newVeh.id).toBeTruthy();
      expect(newVeh.registration_number).toBe(reg);
      expect(newVeh.initial_km).toBe(12000);
      expect(newVeh.current_odometer).toBe(12000);
      expect(newVeh.is_active).toBe(true);
    });

    it('edits vehicle details (number, type, company, initial KM, status) without duplicating', async () => {
      const vehiclesBefore = await dataRepo.getVehicles();
      const targetVehicle = vehiclesBefore[0];
      const countBefore = vehiclesBefore.length;

      const updated = await dataRepo.updateVehicle(targetVehicle.id, {
        make_model: 'Eicher Pro 2049 Edited',
        vehicle_type: 'van',
        initial_km: 45000,
        current_odometer: 48500,
        is_active: true,
      });

      expect(updated.id).toBe(targetVehicle.id);
      expect(updated.make_model).toBe('Eicher Pro 2049 Edited');
      expect(updated.vehicle_type).toBe('van');
      expect(updated.initial_km).toBe(45000);
      expect(updated.current_odometer).toBe(48500);

      // Verify no duplicate record created
      const vehiclesAfter = await dataRepo.getVehicles();
      expect(vehiclesAfter.length).toBe(countBefore);
    });

    it('archives a vehicle while preserving trip history', async () => {
      const vehicles = await dataRepo.getVehicles();
      const targetVehicle = vehicles[0];

      const detailBefore = await dataRepo.getVehicleDetail(targetVehicle.id, TEST_MONTH);
      const tripCountBefore = detailBefore?.travelHistory.length || 0;

      await dataRepo.archiveVehicle(targetVehicle.id);

      const vehiclesAfter = await dataRepo.getVehicles();
      const archived = vehiclesAfter.find((v) => v.id === targetVehicle.id);
      expect(archived?.is_active).toBe(false);

      const detailAfter = await dataRepo.getVehicleDetail(targetVehicle.id, TEST_MONTH);
      expect(detailAfter?.travelHistory.length).toBe(tripCountBefore);

      // Restore vehicle
      await dataRepo.updateVehicle(targetVehicle.id, { is_active: true });
    });
  });

  // =========================================================================
  // 3. COMPANIES
  // =========================================================================
  describe('3. COMPANIES Edit Control', () => {
    it('creates a company, renames it, and moves a vehicle from one company to another', async () => {
      const uniqueSuffix = Date.now().toString().slice(-4);
      const compName = `Test Logistics ${uniqueSuffix}`;

      // 1. Create company
      const comp = await dataRepo.createCompany({
        name: compName,
        contact_person: 'Faris Shafeeq',
        contact_phone: '+91 99950 11223',
      });

      expect(comp.id).toBeTruthy();
      expect(comp.name).toBe(compName);

      // 2. Rename company
      const renamedName = `${compName} Renamed`;
      const updatedComp = await dataRepo.updateCompany(comp.id, {
        name: renamedName,
      });
      expect(updatedComp.name).toBe(renamedName);

      // 3. Move a vehicle to this new company
      const vehicles = await dataRepo.getVehicles();
      const testVehicle = vehicles[0];
      const previousCompanyId = testVehicle.company_id;

      await dataRepo.updateVehicle(testVehicle.id, {
        company_id: comp.id,
      });

      // Verify vehicle moved
      const movedVehicle = (await dataRepo.getVehicles()).find((v) => v.id === testVehicle.id);
      expect(movedVehicle?.company_id).toBe(comp.id);

      // Move vehicle back
      if (previousCompanyId) {
        await dataRepo.updateVehicle(testVehicle.id, {
          company_id: previousCompanyId,
        });
      }
    });
  });

  // =========================================================================
  // 4. TRIPS
  // =========================================================================
  describe('4. TRIPS Edit Control and Audit Rules', () => {
    it('allows owner to manually add a missed trip and auto-increments odometer', async () => {
      const drivers = await dataRepo.getDrivers();
      const vehicles = await dataRepo.getVehicles();
      const driver = drivers[0];
      const vehicle = vehicles[0];

      const startKm = vehicle.current_odometer + 10;
      const endKm = startKm + 45;

      const manualTrip = await dataRepo.addManualTrip({
        driverId: driver.id,
        vehicleId: vehicle.id,
        startOdometer: startKm,
        endOdometer: endKm,
        startTime: '2026-10-24T09:00:00.000Z',
        endTime: '2026-10-24T12:30:00.000Z',
        startPlace: 'Calicut Depot Hub',
        endPlace: 'Malappuram Gateway',
        notes: 'Missed trip added by owner manually',
      });

      expect(manualTrip.id).toBeTruthy();
      expect(manualTrip.start_odometer).toBe(startKm);
      expect(manualTrip.end_odometer).toBe(endKm);
      expect(manualTrip.route_name).toBe('Calicut Depot Hub');
      expect(manualTrip.destination).toBe('Malappuram Gateway');
      expect(manualTrip.edited_by_owner_at).toBeTruthy();

      // Verify vehicle odometer updated
      const vAfter = (await dataRepo.getVehicles()).find((v) => v.id === vehicle.id);
      expect(vAfter?.current_odometer).toBeGreaterThanOrEqual(endKm);

      // Now edit the trip (change start/end place and KM)
      const correctedTrip = await dataRepo.updateTrip(manualTrip.id, {
        start_place: 'Calicut Main Hub',
        end_place: 'Kochi Harbour',
        start_odometer: startKm,
        end_odometer: endKm + 5,
        driver_notes: 'Corrected destination by owner',
      });

      expect(correctedTrip.route_name).toBe('Calicut Main Hub');
      expect(correctedTrip.destination).toBe('Kochi Harbour');
      expect(correctedTrip.end_odometer).toBe(endKm + 5);
      expect(correctedTrip.edited_by_owner_at).toBeTruthy();

      // Delete the trip
      const deleted = await dataRepo.deleteTrip(manualTrip.id);
      expect(deleted).toBe(true);
    });
  });

  // =========================================================================
  // 5. EXPENSES
  // =========================================================================
  describe('5. EXPENSES Edit Control and Audit Rules', () => {
    it('allows owner to add an expense on behalf of driver, edit it, and delete it', async () => {
      const drivers = await dataRepo.getDrivers();
      const vehicles = await dataRepo.getVehicles();
      const driver = drivers[0];
      const vehicle = vehicles[0];

      // 1. Add expense on behalf of driver
      const newExp = await dataRepo.createExpense({
        vehicle_id: vehicle.id,
        driver_id: driver.id,
        expense_type: 'Fuel',
        amount: 3200,
        litres: 32,
        note: 'Fuel logged by owner on behalf of driver',
        date: '2026-10-24',
        isOwner: true,
      });

      expect(newExp.id).toBeTruthy();
      expect(newExp.amount).toBe(3200);
      expect(newExp.expense_type).toBe('Fuel');

      // 2. Edit expense (change amount, type, note)
      const updatedExp = await dataRepo.updateExpense(newExp.id, {
        expense_type: 'Maintenance',
        amount: 3500,
        note: 'Corrected to Maintenance by owner',
        date: '2026-10-24',
      });

      expect(updatedExp.expense_type).toBe('Maintenance');
      expect(updatedExp.amount).toBe(3500);
      expect(updatedExp.edited_by_owner_at).toBeTruthy();

      // 3. Delete expense
      const deleted = await dataRepo.deleteExpense(newExp.id);
      expect(deleted).toBe(true);
    });
  });

  // =========================================================================
  // 6. INCOME & FINANCIAL RECALCULATION
  // =========================================================================
  describe('6. INCOME Edit & Recalculation', () => {
    it('allows owner to edit monthly vehicle income and recalculates profit/loss', async () => {
      const vehicles = await dataRepo.getVehicles();
      const vehicle = vehicles[0];

      const customIncome = 68000;
      await dataRepo.setVehicleMonthlyIncome(vehicle.id, TEST_MONTH, customIncome);

      const report = await dataRepo.getVehicleDetail(vehicle.id, TEST_MONTH);
      expect(report).not.toBeNull();
      if (report) {
        expect(report.monthlyIncome).toBe(customIncome);
        expect(report.profitOrLoss).toBe(customIncome - report.expenses.totals.grandTotal);
      }
    });
  });

  // =========================================================================
  // 7. SETTINGS & DRIVER OVERRIDE
  // =========================================================================
  describe('7. SETTINGS & Rest Cooldown Override', () => {
    it('updates min wait time between trips and owner access password', async () => {
      await dataRepo.updateSettings('min_trip_interval_hours', '8');
      await dataRepo.updateSettings('owner_password', 'secret2026');

      const settings = await dataRepo.getSettings();
      expect(Number(settings.min_trip_interval_hours)).toBe(8);
      expect(settings.owner_password).toBe('secret2026');

      // Reset back to defaults
      await dataRepo.updateSettings('min_trip_interval_hours', '6');
      await dataRepo.updateSettings('owner_password', 'kore2026');
    });

    it('allows "Allow now" button on a driver to bypass rest interval once', async () => {
      const drivers = await dataRepo.getDrivers();
      const driver = drivers[0];

      await dataRepo.allowDriverOverride(driver.id);

      // Verify the override was applied
      const updatedDrivers = await dataRepo.getDrivers();
      const updated = updatedDrivers.find((d) => d.id === driver.id);
      expect(Boolean(updated?.allow_next_trip_override)).toBe(true);
    });
  });
});
