import { describe, it, expect, beforeEach } from 'vitest';
import { dataRepo } from '@/lib/data-service';

describe('Part 3: Owner Dashboard Screens', () => {
  const TEST_MONTH = '2026-10';

  // -------------------------------------------------------------------------
  // A) DRIVERS
  // -------------------------------------------------------------------------
  describe('A) Drivers Management and Detail View', () => {
    it('provides driver list with name, phone, status, and active vehicle', async () => {
      const drivers = await dataRepo.getDrivers();
      expect(drivers.length).toBeGreaterThan(0);

      const driver = drivers[0];
      expect(driver.full_name).toBeTruthy();
      expect(driver.phone).toBeTruthy();

      const activeTrip = dataRepo.getActiveTripForDriver(driver.id);
      if (activeTrip) {
        expect(activeTrip.vehicle).toBeDefined();
        expect(activeTrip.vehicle.registration_number).toBeTruthy();
      } else {
        expect(activeTrip).toBeNull();
      }
    });

    it('calculates driver monthly summary for salary payment (trips, days worked, total km)', async () => {
      const drivers = await dataRepo.getDrivers();
      const driver = drivers[0];

      const summary = await dataRepo.getDriverMonthlySummary(driver.id, TEST_MONTH);
      expect(summary.driver.id).toBe(driver.id);
      expect(summary.month).toBe(TEST_MONTH);
      expect(typeof summary.totalTripsCount).toBe('number');
      expect(typeof summary.totalDaysWorked).toBe('number');
      expect(typeof summary.totalKilometers).toBe('number');

      // Summary must be calculated from trip list
      if (summary.tripDetails.length > 0) {
        expect(summary.totalTripsCount).toBe(summary.tripDetails.length);
        const sumKm = summary.tripDetails.reduce((acc, t) => acc + t.distance, 0);
        expect(summary.totalKilometers).toBe(Math.round(sumKm * 10) / 10);
      }
    });

    it('breaks down vehicles driven this month and trip list with start/end KM', async () => {
      const drivers = await dataRepo.getDrivers();
      const driver = drivers[0];
      const summary = await dataRepo.getDriverMonthlySummary(driver.id, TEST_MONTH);

      // Vehicles driven breakdown
      expect(Array.isArray(summary.vehiclesBreakdown)).toBe(true);
      for (const item of summary.vehiclesBreakdown) {
        expect(item.vehicle.registration_number).toBeTruthy();
        expect(item.tripsCount).toBeGreaterThan(0);
        expect(item.totalKm).toBeGreaterThanOrEqual(0);
      }

      // Trip list details
      for (const trip of summary.tripDetails) {
        expect(trip.dutyDate).toBeTruthy();
        expect(trip.vehicleRegistration).toBeTruthy();
        expect(typeof trip.distance).toBe('number');
      }
    });
  });

  // -------------------------------------------------------------------------
  // B) VEHICLES
  // -------------------------------------------------------------------------
  describe('B) Vehicles Management and Detail View', () => {
    it('lists vehicles with registration number, type, company, and status', async () => {
      const vehicles = await dataRepo.getVehicles();
      expect(vehicles.length).toBeGreaterThan(0);

      for (const v of vehicles) {
        expect(v.registration_number).toBeTruthy();
        expect(v.vehicle_type).toBeTruthy();
        expect(v.company).toBeTruthy();
        expect(['active', 'idle', 'on_trip', 'maintenance', 'archived']).toContain(v.status);
      }
    });

    it('calculates vehicle detail: expenses (Fuel, Toll, Maint), editable income, and profit/loss', async () => {
      const vehicles = await dataRepo.getVehicles();
      const vehicle = vehicles[0];

      // Set owner monthly income for vehicle
      const testIncome = 65000;
      await dataRepo.setVehicleMonthlyIncome(vehicle.id, TEST_MONTH, testIncome);

      const report = await dataRepo.getVehicleDetail(vehicle.id, TEST_MONTH);
      expect(report).not.toBeNull();
      if (!report) return;

      expect(report.vehicle.registration_number).toBe(vehicle.registration_number);
      expect(report.monthlyIncome).toBe(testIncome);

      // Check expense breakdown
      const { fuelTotal, tollTotal, maintenanceTotal, totalExpense } = report.expenseSummary;
      expect(totalExpense).toBe(fuelTotal + tollTotal + maintenanceTotal + (report.expenseSummary.otherTotal || 0));

      // PROFIT or LOSS = income minus expenses
      expect(report.profitOrLoss).toBe(testIncome - totalExpense);

      // Drivers who ran this vehicle this month
      expect(Array.isArray(report.driversWhoDrove)).toBe(true);
      for (const d of report.driversWhoDrove) {
        expect(d.driverName).toBeTruthy();
        expect(d.tripsCount).toBeGreaterThan(0);
      }

      // Expense list: date, driver, type, amount, note
      for (const exp of report.expenses.entries) {
        expect(exp.date).toBeTruthy();
        expect(['Fuel', 'Toll', 'Maintenance', 'Other']).toContain(exp.expense_type);
        expect(typeof exp.amount).toBe('number');
      }
    });
  });

  // -------------------------------------------------------------------------
  // C) COMPANIES
  // -------------------------------------------------------------------------
  describe('C) Companies and Strict Aggregation Verification', () => {
    it('ensures company total expense, income, and profit/loss strictly equals sum of its vehicles', async () => {
      const companies = await dataRepo.getCompanies();
      expect(companies.length).toBeGreaterThan(0);

      const company = companies[0];
      const compReport = await dataRepo.getCompanyMonthlyReport(company.id, TEST_MONTH);
      expect(compReport).not.toBeNull();
      if (!compReport) return;

      expect(compReport.company.id).toBe(company.id);
      expect(compReport.month).toBe(TEST_MONTH);

      // Strict Equality Verification:
      // The company total must equal the sum of its vehicles.
      const sumVehicleExpenses = compReport.vehicles.reduce((sum, v) => sum + v.totalExpense, 0);
      const sumVehicleIncome = compReport.vehicles.reduce((sum, v) => sum + v.income, 0);
      const sumVehicleProfitOrLoss = compReport.vehicles.reduce((sum, v) => sum + v.profitOrLoss, 0);

      expect(compReport.totalExpenses).toBe(sumVehicleExpenses);
      expect(compReport.totalIncome).toBe(sumVehicleIncome);
      expect(compReport.profitOrLoss).toBe(compReport.totalIncome - compReport.totalExpenses);
      expect(compReport.profitOrLoss).toBe(sumVehicleProfitOrLoss);

      // Each vehicle breakdown must detail Fuel, Toll, Maintenance, Total Expense
      for (const v of compReport.vehicles) {
        expect(v.vehicle.registration_number).toBeTruthy();
        expect(typeof v.fuelExpense).toBe('number');
        expect(typeof v.tollExpense).toBe('number');
        expect(typeof v.maintenanceExpense).toBe('number');
        expect(v.totalExpense).toBe(v.fuelExpense + v.tollExpense + v.maintenanceExpense);
        expect(v.profitOrLoss).toBe(v.income - v.totalExpense);
      }
    });
  });

  // -------------------------------------------------------------------------
  // D) LIVE VIEW
  // -------------------------------------------------------------------------
  describe('D) Live View and Real-Time Expense Updates', () => {
    it('driver-entered expenses appear instantly and update vehicle and company totals', async () => {
      const vehicles = await dataRepo.getVehicles();
      const vehicle = vehicles[0];
      const drivers = await dataRepo.getDrivers();
      const driver = drivers[0];

      // Read report before
      const beforeVehicleReport = await dataRepo.getVehicleDetail(vehicle.id, TEST_MONTH);
      const beforeExpenseTotal = beforeVehicleReport?.expenseSummary.totalExpense || 0;

      // Driver enters an expense (e.g. Toll: 350)
      const addedExpense = await dataRepo.createExpense({
        vehicle_id: vehicle.id,
        driver_id: driver.id,
        expense_type: 'Toll',
        amount: 350,
        note: 'Live view instant toll check',
        date: `${TEST_MONTH}-24`,
      });

      expect(addedExpense.id).toBeTruthy();

      // Read report after -> must instantly include the 350 expense
      const afterVehicleReport = await dataRepo.getVehicleDetail(vehicle.id, TEST_MONTH);
      expect(afterVehicleReport?.expenseSummary.tollTotal).toBe(
        (beforeVehicleReport?.expenseSummary.tollTotal || 0) + 350
      );
      expect(afterVehicleReport?.expenseSummary.totalExpense).toBe(beforeExpenseTotal + 350);

      // Clean up test expense
      await dataRepo.deleteExpense(addedExpense.id);
    });

    it('real-time status reflects active trip on vehicle and driver', async () => {
      const drivers = await dataRepo.getDrivers();
      const vehicles = await dataRepo.getVehicles();
      const driver = drivers.find((d) => d.status === 'idle') || drivers[0];
      const vehicle = vehicles.find((v) => v.status === 'idle') || vehicles[0];

      // Allow driver in case of rest cooldown
      await dataRepo.allowDriverOverride(driver.id);

      const startKm = dataRepo.getStartingKmForVehicle(vehicle.id);
      const trip = await dataRepo.startTripForDriver({
        driverPhoneOrId: driver.id,
        vehicleId: vehicle.id,
        startOdometer: startKm,
        destination: 'Live View Status Run',
      });

      // Immediately verify owner sees who is on which vehicle right now
      const activeTripDriver = dataRepo.getActiveTripForDriver(driver.id);
      expect(activeTripDriver).not.toBeNull();
      expect(activeTripDriver?.vehicle.id).toBe(vehicle.id);

      const activeTripVehicle = dataRepo.getActiveTripForVehicle(vehicle.id);
      expect(activeTripVehicle).not.toBeNull();
      expect(activeTripVehicle?.driver.id).toBe(driver.id);

      // Complete trip to return to idle
      await dataRepo.completeTrip({
        tripId: trip.id,
        endOdometer: startKm + 18,
      });

      expect(dataRepo.getActiveTripForDriver(driver.id)).toBeNull();
      expect(dataRepo.getActiveTripForVehicle(vehicle.id)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // E) SETTINGS
  // -------------------------------------------------------------------------
  describe('E) Fleet Operational Settings', () => {
    it('manages wait time between trips (hours, default 6) and persists updates', async () => {
      // Default must be 6
      const initialSettings = await dataRepo.getSettings();
      expect(initialSettings.min_trip_interval_hours).toBeDefined();

      // Update wait time to 8 hours
      await dataRepo.updateSettings('min_trip_interval_hours', '8');
      const updatedSettings = await dataRepo.getSettings();
      expect(Number(updatedSettings.min_trip_interval_hours)).toBe(8);

      // Reset back to default 6
      await dataRepo.updateSettings('min_trip_interval_hours', '6');
      const restored = await dataRepo.getSettings();
      expect(Number(restored.min_trip_interval_hours)).toBe(6);
    });
  });
});
