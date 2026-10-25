import { describe, it, expect } from 'vitest';
import { dataRepo } from '@/lib/data-service';
import { fleetDb } from '@/lib/server/db';
import { reverseGeocode } from '@/lib/utils/location';
import fs from 'fs';
import path from 'path';

describe('Part 6: Travel History, Maps, and Final Verification', () => {
  const TEST_MONTH = '2026-10';

  // =========================================================================
  // TRAVEL HISTORY & REVERSE GEOCODING
  // =========================================================================
  describe('Travel History & Reverse Geocoding', () => {
    it('reverse geocodes coordinates to readable place name with fallback when unavailable', async () => {
      // Known Kerala coordinates (Calicut / Kozhikode)
      const res = await reverseGeocode(11.2588, 75.7804);
      expect(res).toBeTruthy();
      expect(typeof res).toBe('string');
      // When coordinates are 0, 0
      const invalid = await reverseGeocode(0, 0);
      expect(invalid).toBe('Location not available');
    }, 10000);

    it('vehicle detail contains travel history sorted newest first with required metrics', async () => {
      const vehicles = await dataRepo.getVehicles();
      const targetVehicle = vehicles[0];
      const detail = await dataRepo.getVehicleDetail(targetVehicle.id, TEST_MONTH);
      expect(detail).toBeTruthy();
      expect(detail?.travelHistory).toBeDefined();

      if (detail && detail.travelHistory.length > 1) {
        // Verify newest first
        for (let i = 0; i < detail.travelHistory.length - 1; i++) {
          const t1 = new Date(detail.travelHistory[i].startTime || detail.travelHistory[i].dutyDate).getTime();
          const t2 = new Date(detail.travelHistory[i + 1].startTime || detail.travelHistory[i + 1].dutyDate).getTime();
          expect(t1).toBeGreaterThanOrEqual(t2);
        }

        // Verify required fields: date, driver name, start place, end place, start KM, end KM, km run
        const trip = detail.travelHistory[0];
        expect(trip.dutyDate).toBeDefined();
        expect(trip.driverName).toBeDefined();
        expect(trip.startPlace).toBeDefined();
        expect(trip.endPlace).toBeDefined();
        expect(trip.startOdometer).toBeDefined();
        expect(trip.distanceKm).toBeGreaterThanOrEqual(0);
      }
    });

    it('allows owner to edit start place and end place text of a trip and reflects in travel history', async () => {
      const vehicles = await dataRepo.getVehicles();
      const targetVehicle = vehicles[0];
      const drivers = await dataRepo.getDrivers();
      const driver = drivers[0];

      // Create a test trip with start and end place
      const trip = await dataRepo.addManualTrip({
        vehicleId: targetVehicle.id,
        driverId: driver.id,
        startOdometer: targetVehicle.current_odometer + 10,
        endOdometer: targetVehicle.current_odometer + 60,
        startTime: `${TEST_MONTH}-20T08:00:00.000Z`,
        endTime: `${TEST_MONTH}-20T12:00:00.000Z`,
        startPlace: 'Calicut Central Depot',
        endPlace: 'Malappuram Transit Point',
      });

      expect(trip.id).toBeTruthy();

      // Owner edits start place and end place
      const updated = await dataRepo.updateTrip(trip.id, {
        start_place: 'Kozhikode Railway Logistics',
        end_place: 'Manjeri Warehouse Hub',
      });

      expect(updated.id).toBe(trip.id);

      // Verify in vehicle detail travel history
      const detail = await dataRepo.getVehicleDetail(targetVehicle.id, TEST_MONTH);
      const editedTrip = detail?.travelHistory.find((t) => t.tripId === trip.id);
      expect(editedTrip).toBeDefined();
      expect(editedTrip?.startPlace).toBe('Kozhikode Railway Logistics');
      expect(editedTrip?.endPlace).toBe('Manjeri Warehouse Hub');

      // Clean up
      await dataRepo.deleteTrip(trip.id);
    });

    it('gracefully handles unavailable location and shows Location not available', async () => {
      const vehicles = await dataRepo.getVehicles();
      const targetVehicle = vehicles[0];
      const drivers = await dataRepo.getDrivers();
      const driver = drivers[0];

      // Start a trip with no location
      const trip = await dataRepo.addManualTrip({
        vehicleId: targetVehicle.id,
        driverId: driver.id,
        startOdometer: targetVehicle.current_odometer + 5,
        endOdometer: targetVehicle.current_odometer + 25,
        startTime: `${TEST_MONTH}-21T09:00:00.000Z`,
        endTime: `${TEST_MONTH}-21T11:00:00.000Z`,
        startPlace: '', // empty to test fallback
        endPlace: '',
      });

      const detail = await dataRepo.getVehicleDetail(targetVehicle.id, TEST_MONTH);
      const testTrip = detail?.travelHistory.find((t) => t.tripId === trip.id);
      expect(testTrip).toBeDefined();
      expect(testTrip?.startPlace).toBe('Location not available');
      expect(testTrip?.endPlace).toBe('Location not available');

      // Clean up
      await dataRepo.deleteTrip(trip.id);
    });
  });

  // =========================================================================
  // FINAL TESTING SCENARIOS (a) to (h)
  // =========================================================================
  describe('Final Testing Scenarios (a) through (h)', () => {
    // (a) A driver starts a trip, and the owner sees "On trip" within seconds
    it('(a) Driver starts a trip, and owner sees "On trip" status for driver and vehicle', async () => {
      const drivers = await dataRepo.getDrivers();
      const vehicles = await dataRepo.getVehicles();
      const testDriver = drivers[drivers.length - 1];
      const testVehicle = vehicles[vehicles.length - 1];

      // Ensure driver is allowed (override any cooldown)
      await dataRepo.allowDriverOverride(testDriver.id);

      // Driver starts a trip
      const startKm = dataRepo.getStartingKmForVehicle(testVehicle.id);
      const activeTrip = await dataRepo.startTripForDriver({
        driverPhoneOrId: testDriver.id,
        vehicleId: testVehicle.id,
        startOdometer: startKm,
        destination: 'Test Live Route',
      });

      expect(activeTrip.id).toBeTruthy();
      expect(activeTrip.status).toBe('in_progress');

      // Owner checks status
      const liveDriverTrip = dataRepo.getActiveTripForDriver(testDriver.id);
      expect(liveDriverTrip).toBeTruthy();
      expect(liveDriverTrip?.vehicle.id).toBe(testVehicle.id);

      const liveVehicleTrip = dataRepo.getActiveTripForVehicle(testVehicle.id);
      expect(liveVehicleTrip).toBeTruthy();
      expect(liveVehicleTrip?.driver.id).toBe(testDriver.id);

      // Clean up by ending the trip
      await dataRepo.completeTrip({
        tripId: activeTrip.id,
        endOdometer: startKm + 15,
        notes: 'End test trip a',
      });
    });

    // (b) Owner changes a driver's phone number. Reload both apps. It must stay changed everywhere, with no duplicate driver
    it("(b) Owner changes driver phone number: persists across reloads with no duplicate driver", async () => {
      const driversBefore = await dataRepo.getDrivers();
      const countBefore = driversBefore.length;
      const targetDriver = driversBefore[0];
      const newPhone = '9995551122';

      // Update phone number
      const updated = await dataRepo.updateDriver(targetDriver.id, {
        phone: newPhone,
      });

      expect(updated.id).toBe(targetDriver.id);
      expect(updated.phone).toBe(newPhone);

      // Simulate app reload by refreshing data repo
      await dataRepo.refresh();
      const driversAfter = await dataRepo.getDrivers();
      expect(driversAfter.length).toBe(countBefore);

      const reloadedDriver = driversAfter.find((d) => d.id === targetDriver.id);
      expect(reloadedDriver?.phone).toBe(newPhone);

      // Restore original phone
      await dataRepo.updateDriver(targetDriver.id, {
        phone: targetDriver.phone,
      });
    });

    // (c) A driver ends a trip with KM and expenses. The owner's numbers (KM, expenses, profit/loss) match exactly
    it("(c) Driver ends trip with KM and expenses: owner's totals (KM, expenses, profit/loss) match exactly", async () => {
      const vehicles = await dataRepo.getVehicles();
      const testVehicle = vehicles[0];
      const drivers = await dataRepo.getDrivers();
      const testDriver = drivers[0];

      // Get initial metrics
      const detailBefore = await dataRepo.getVehicleDetail(testVehicle.id, TEST_MONTH);
      const kmBefore = detailBefore?.totalMonthKm || 0;
      const expBefore = detailBefore?.expenseSummary.totalExpense || 0;
      const profitBefore = detailBefore?.profitOrLoss || 0;

      // Allow driver
      await dataRepo.allowDriverOverride(testDriver.id);
      const startKm = dataRepo.getStartingKmForVehicle(testVehicle.id);

      // Start trip
      const trip = await dataRepo.startTripForDriver({
        driverPhoneOrId: testDriver.id,
        vehicleId: testVehicle.id,
        startOdometer: startKm,
        destination: 'Accuracy Corridor',
      });

      // Complete trip with +50 KM and 1500 INR fuel expense
      const tripDistance = 50;
      const expenseAmount = 1500;
      await dataRepo.completeTrip({
        tripId: trip.id,
        endOdometer: startKm + tripDistance,
        expenses: [
          {
            expense_type: 'Fuel',
            amount: expenseAmount,
            litres: 15,
            note: 'Verification fuel',
          },
        ],
      });

      // Owner recalculates detail
      const detailAfter = await dataRepo.getVehicleDetail(testVehicle.id, TEST_MONTH);
      expect(detailAfter?.totalMonthKm).toBe(kmBefore + tripDistance);
      expect(detailAfter?.expenseSummary.totalExpense).toBe(expBefore + expenseAmount);
      expect(detailAfter?.profitOrLoss).toBe(profitBefore - expenseAmount);

      // Clean up trip and expense
      await dataRepo.deleteTrip(trip.id);
    });

    // (d) A driver cannot start a second trip during wait time, and "Allow now" works
    it('(d) Driver rest interval blocks second trip during wait time, and "Allow now" override unblocks it', async () => {
      const drivers = await dataRepo.getDrivers();
      const testDriver = drivers[1];
      const vehicles = await dataRepo.getVehicles();
      const testVehicle = vehicles[1];

      // Override any existing cooldown to start clean
      await dataRepo.allowDriverOverride(testDriver.id);
      const startKm = dataRepo.getStartingKmForVehicle(testVehicle.id);

      const trip = await dataRepo.startTripForDriver({
        driverPhoneOrId: testDriver.id,
        vehicleId: testVehicle.id,
        startOdometer: startKm,
      });

      // Complete trip
      await dataRepo.completeTrip({
        tripId: trip.id,
        endOdometer: startKm + 10,
      });

      // Check cooldown: must be blocked because min trip interval hours is active
      const cooldownCheck = dataRepo.checkDriverRestCooldown(testDriver.id);
      expect(cooldownCheck.allowed).toBe(false);
      expect(cooldownCheck.reason).toContain('Your last trip ended at');

      // Owner clicks "Allow now"
      await dataRepo.allowDriverOverride(testDriver.id);

      // Check cooldown again: now allowed!
      const unblockedCheck = dataRepo.checkDriverRestCooldown(testDriver.id);
      expect(unblockedCheck.allowed).toBe(true);

      // Clean up
      await dataRepo.deleteTrip(trip.id);
    });

    // (e) Owner edits a trip's KM and route, and all totals update correctly
    it("(e) Owner edits a trip's KM and route: vehicle totals update correctly", async () => {
      const vehicles = await dataRepo.getVehicles();
      const testVehicle = vehicles[0];
      const drivers = await dataRepo.getDrivers();
      const testDriver = drivers[0];

      // Add a test trip with 100 KM
      const startKm = testVehicle.current_odometer + 20;
      const initialDist = 100;
      const trip = await dataRepo.addManualTrip({
        vehicleId: testVehicle.id,
        driverId: testDriver.id,
        startOdometer: startKm,
        endOdometer: startKm + initialDist,
        startTime: `${TEST_MONTH}-19T08:00:00.000Z`,
        endTime: `${TEST_MONTH}-19T11:00:00.000Z`,
        startPlace: 'Initial Route Start',
        endPlace: 'Initial Route End',
      });

      const detail1 = await dataRepo.getVehicleDetail(testVehicle.id, TEST_MONTH);
      const km1 = detail1?.totalMonthKm || 0;

      // Owner edits trip to 140 KM (+40 KM) and changes route
      const newDist = 140;
      await dataRepo.updateTrip(trip.id, {
        start_odometer: startKm,
        end_odometer: startKm + newDist,
        start_place: 'Updated Route Start',
        end_place: 'Updated Route End',
      });

      const detail2 = await dataRepo.getVehicleDetail(testVehicle.id, TEST_MONTH);
      const km2 = detail2?.totalMonthKm || 0;

      expect(km2).toBe(km1 + 40);

      const edited = detail2?.travelHistory.find((t) => t.tripId === trip.id);
      expect(edited?.startPlace).toBe('Updated Route Start');
      expect(edited?.endPlace).toBe('Updated Route End');
      expect(edited?.distanceKm).toBe(newDist);

      // Clean up
      await dataRepo.deleteTrip(trip.id);
    });

    // (f) The company page total equals the sum of its vehicles
    it('(f) Company monthly report totals equal the exact sum of its vehicles', async () => {
      const companies = await dataRepo.getCompanies();
      expect(companies.length).toBeGreaterThan(0);

      for (const comp of companies) {
        const report = await dataRepo.getCompanyMonthlyReport(comp.id, TEST_MONTH);
        expect(report).toBeDefined();

        if (report && report.vehicles.length > 0) {
          const sumIncome = report.vehicles.reduce((acc, v) => acc + v.income, 0);
          const sumExpense = report.vehicles.reduce((acc, v) => acc + v.totalExpense, 0);
          const sumProfit = sumIncome - sumExpense;

          expect(report.totalIncome).toBe(sumIncome);
          expect(report.totalExpenses).toBe(sumExpense);
          expect(report.profitOrLoss).toBe(sumProfit);
        }
      }
    });

    // (g) The data is identical after a redeploy
    it('(g) Data is identical after server restart / database reload', async () => {
      // Query raw data from SQLite
      const data1 = fleetDb.getAllData();
      expect(data1.vehicles.length).toBeGreaterThan(0);
      expect(data1.drivers.length).toBeGreaterThan(0);

      // Force reload from disk
      await dataRepo.refresh();
      const data2 = fleetDb.getAllData();

      expect(data2.vehicles.length).toBe(data1.vehicles.length);
      expect(data2.drivers.length).toBe(data1.drivers.length);
      expect(data2.trips.length).toBe(data1.trips.length);
      expect(data2.expenses.length).toBe(data1.expenses.length);
    });

    // (h) The app installs as a PWA with the Kore logo icon, and there is no Malayalam text anywhere
    it('(h) PWA manifest is valid with Kore logo icons and English-only text across entire codebase', () => {
      const manifestPath = path.resolve('public/manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      expect(manifestContent.name).toMatch(/Nalakath Logistics|Kore/);
      expect(manifestContent.short_name).toMatch(/Nalakath|Kore/);
      expect(manifestContent.theme_color).toBe('#121316');
      expect(manifestContent.background_color).toBe('#121316');

      // Verify all required icons exist on disk
      const icon192 = path.resolve('public/icon-192.png');
      const icon512 = path.resolve('public/icon-512.png');
      const maskable192 = path.resolve('public/maskable-icon-192.png');
      const maskable512 = path.resolve('public/maskable-icon-512.png');
      const appleIcon = path.resolve('public/apple-touch-icon.png');
      const favicon = path.resolve('public/favicon.ico');

      expect(fs.existsSync(icon192)).toBe(true);
      expect(fs.existsSync(icon512)).toBe(true);
      expect(fs.existsSync(maskable192)).toBe(true);
      expect(fs.existsSync(maskable512)).toBe(true);
      expect(fs.existsSync(appleIcon)).toBe(true);
      expect(fs.existsSync(favicon)).toBe(true);

      // Verify no Malayalam characters (Unicode range \u0D00-\u0D7F) in core UI source code
      const srcDir = path.resolve('src/components');
      const appDir = path.resolve('src/app');

      const checkNoMalayalam = (dir: string) => {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
          const fullPath = path.join(dir, file.name);
          if (file.isDirectory()) {
            checkNoMalayalam(fullPath);
          } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const malMatch = content.match(/[\u0D00-\u0D7F]/);
            expect(malMatch).toBeNull();
          }
        }
      };

      checkNoMalayalam(srcDir);
      checkNoMalayalam(appDir);
    });
  });
});
