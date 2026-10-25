import { describe, it, expect, beforeAll } from 'vitest';
import { dataRepo } from '@/lib/data-service';
import {
  generateVehicleExcel,
  generateCompanyExcel,
  generateDriverExcel,
} from '@/lib/utils/excel-builder';
import zlib from 'zlib';

function parseZipEntries(buffer: Buffer): string[] {
  const filenames: string[] = [];
  let offset = 0;

  while (offset < buffer.length - 4) {
    const sig = buffer.readUInt32LE(offset);
    if (sig === 0x04034b50) {
      // Local file header
      const nameLen = buffer.readUInt16LE(offset + 26);
      const extraLen = buffer.readUInt16LE(offset + 28);
      const compressedSize = buffer.readUInt32LE(offset + 18);
      const name = buffer.toString('utf8', offset + 30, offset + 30 + nameLen);
      filenames.push(name);
      offset += 30 + nameLen + extraLen + compressedSize;
    } else if (sig === 0x02014b50) {
      // Central directory header
      const nameLen = buffer.readUInt16LE(offset + 28);
      const extraLen = buffer.readUInt16LE(offset + 30);
      const commentLen = buffer.readUInt16LE(offset + 32);
      offset += 46 + nameLen + extraLen + commentLen;
    } else if (sig === 0x06054b50) {
      // End of central directory
      break;
    } else {
      offset++;
    }
  }

  return filenames;
}

function extractZipFile(buffer: Buffer, targetPath: string): string | null {
  let offset = 0;
  while (offset < buffer.length - 4) {
    const sig = buffer.readUInt32LE(offset);
    if (sig === 0x04034b50) {
      const method = buffer.readUInt16LE(offset + 8);
      const compressedSize = buffer.readUInt32LE(offset + 18);
      const nameLen = buffer.readUInt16LE(offset + 26);
      const extraLen = buffer.readUInt16LE(offset + 28);
      const name = buffer.toString('utf8', offset + 30, offset + 30 + nameLen);
      const dataStart = offset + 30 + nameLen + extraLen;
      const data = buffer.subarray(dataStart, dataStart + compressedSize);

      if (name === targetPath) {
        if (method === 8) {
          const uncompressed = zlib.inflateRawSync(data);
          return uncompressed.toString('utf8');
        } else {
          return data.toString('utf8');
        }
      }
      offset = dataStart + compressedSize;
    } else if (sig === 0x02014b50) {
      const nameLen = buffer.readUInt16LE(offset + 28);
      const extraLen = buffer.readUInt16LE(offset + 30);
      const commentLen = buffer.readUInt16LE(offset + 32);
      offset += 46 + nameLen + extraLen + commentLen;
    } else if (sig === 0x06054b50) {
      break;
    } else {
      offset++;
    }
  }
  return null;
}

describe('Part 7: Single Driver Expense Form & Excel Downloads', () => {
  let testDriverId: string;
  let testVehicleId: string;
  const month = '2026-10';

  beforeAll(async () => {
    const drivers = await dataRepo.getDrivers();
    const vehicles = await dataRepo.getVehicles();
    testDriverId = drivers[0].id;
    testVehicleId = vehicles[0].id;
  });

  describe('1. DRIVER EXPENSE FORM (single form)', () => {
    it('saves multiple expense records (Fuel, Toll, Maintenance) in one shot linked to the trip', async () => {
      // Start a test trip
      const trip = await dataRepo.startTripForDriver({
        driverPhoneOrId: testDriverId,
        vehicleId: testVehicleId,
        startOdometer: 14000,
        destination: 'Kochi Terminal',
      });

      expect(trip).toBeDefined();
      expect(trip.id).toBeDefined();

      // Driver enters expenses in the single form: Fuel: 2500, Toll: 320, Maintenance: 850 with note
      const note = 'Fuel at HP pump, Toll at Paliyekkara';
      const expenseEntries = [
        { type: 'Fuel' as const, amount: 2500 },
        { type: 'Toll' as const, amount: 320 },
        { type: 'Maintenance' as const, amount: 850 },
      ];

      const createdExpenses = await Promise.all(
        expenseEntries.map((e) =>
          dataRepo.createExpense({
            tripId: trip.id,
            vehicle_id: testVehicleId,
            driver_id: testDriverId,
            expense_type: e.type,
            amount: e.amount,
            note,
          })
        )
      );

      expect(createdExpenses).toHaveLength(3);
      expect(createdExpenses[0].expense_type).toBe('Fuel');
      expect(createdExpenses[0].amount).toBe(2500);
      expect(createdExpenses[1].expense_type).toBe('Toll');
      expect(createdExpenses[1].amount).toBe(320);
      expect(createdExpenses[2].expense_type).toBe('Maintenance');
      expect(createdExpenses[2].amount).toBe(850);

      // Verify each expense record is linked to the same trip, vehicle, and driver
      for (const exp of createdExpenses) {
        expect(exp.trip_id).toBe(trip.id);
        expect(exp.vehicle_id).toBe(testVehicleId);
        expect(exp.driver_id).toBe(testDriverId);
        expect(exp.note).toBe(note);
      }

      // Complete trip with additional single-form end-trip expenses
      const endTripExpenses = [
        { expense_type: 'Fuel' as const, amount: 1500, note: 'End trip top-up' },
        { expense_type: 'Toll' as const, amount: 150, note: 'Bridge toll' },
      ];

      const completed = await dataRepo.completeTrip({
        tripId: trip.id,
        endOdometer: 14250,
        notes: 'Delivery completed smoothly',
        expenses: endTripExpenses,
      });

      expect(completed.distanceKm).toBe(250);

      // Verify that owner vehicle detail report reflects all these expenses
      const vehicleReport = await dataRepo.getVehicleDetail(testVehicleId, month);
      expect(vehicleReport).toBeDefined();
      expect(vehicleReport?.expenseSummary.fuelTotal).toBeGreaterThanOrEqual(4000);
      expect(vehicleReport?.expenseSummary.tollTotal).toBeGreaterThanOrEqual(470);
      expect(vehicleReport?.expenseSummary.maintenanceTotal).toBeGreaterThanOrEqual(850);
    });
  });

  describe('2. EXCEL DOWNLOAD: EACH VEHICLE (owner)', () => {
    it('generates a valid .xlsx file containing vehicle details, expense list, and category totals', async () => {
      const vehicleReport = await dataRepo.getVehicleDetail(testVehicleId, month);
      expect(vehicleReport).toBeDefined();

      const buffer = generateVehicleExcel(vehicleReport!, month);
      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(1000);

      // Verify PK magic bytes
      expect(buffer[0]).toBe(0x50); // 'P'
      expect(buffer[1]).toBe(0x4b); // 'K'
      expect(buffer[2]).toBe(0x03);
      expect(buffer[3]).toBe(0x04);

      // Verify zip entries
      const entries = parseZipEntries(buffer);
      expect(entries).toContain('[Content_Types].xml');
      expect(entries).toContain('_rels/.rels');
      expect(entries).toContain('xl/workbook.xml');
      expect(entries).toContain('xl/styles.xml');
      expect(entries).toContain('xl/worksheets/sheet1.xml');

      // Verify worksheet XML contents
      const sheetXml = extractZipFile(buffer, 'xl/worksheets/sheet1.xml');
      expect(sheetXml).toBeDefined();

      // Must contain vehicle registration number
      expect(sheetXml).toContain(vehicleReport!.vehicle.registration_number);
      // Must contain column headings
      expect(sheetXml).toContain('Date');
      expect(sheetXml).toContain('Driver Name');
      expect(sheetXml).toContain('Expense Type');
      expect(sheetXml).toContain('Amount');
      // Must contain category totals
      expect(sheetXml).toContain('Total Fuel');
      expect(sheetXml).toContain('Total Toll');
      expect(sheetXml).toContain('Total Maintenance');
      expect(sheetXml).toContain('Total Expense');

      // Figures in excel must strictly match screen figures
      const fuelTotal = vehicleReport!.expenseSummary.fuelTotal;
      const grandTotal = vehicleReport!.expenseSummary.totalExpense;
      expect(sheetXml).toContain(String(fuelTotal));
      expect(sheetXml).toContain(String(grandTotal));
    });
  });

  describe('3. EXCEL DOWNLOAD: EACH COMPANY (owner)', () => {
    it('generates a valid .xlsx file containing company name, vehicles breakdown, and company totals', async () => {
      const companies = await dataRepo.getCompanies();
      expect(companies.length).toBeGreaterThan(0);
      const company = companies[0];

      const companyReport = await dataRepo.getCompanyMonthlyReport(company.id, month);
      expect(companyReport).toBeDefined();

      const buffer = generateCompanyExcel(companyReport!, month);
      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(1000);

      const entries = parseZipEntries(buffer);
      expect(entries).toContain('xl/worksheets/sheet1.xml');

      const sheetXml = extractZipFile(buffer, 'xl/worksheets/sheet1.xml');
      expect(sheetXml).toBeDefined();

      // Must contain company name
      expect(sheetXml).toContain(company.name);
      // Must contain headings
      expect(sheetXml).toContain('Vehicle Number');
      expect(sheetXml).toContain('Trips');
      expect(sheetXml).toContain('Total KM');
      expect(sheetXml).toContain('Fuel');
      expect(sheetXml).toContain('Toll');
      expect(sheetXml).toContain('Maintenance');
      expect(sheetXml).toContain('Total Expense');
      expect(sheetXml).toContain('Income');
      expect(sheetXml).toContain('Profit/Loss');
      // Must contain company performance totals
      expect(sheetXml).toContain('Total Income (₹)');
      expect(sheetXml).toContain('Total Expenses (₹)');
      expect(sheetXml).toContain('Net Profit / Loss (₹)');

      // Screen figure parity
      expect(sheetXml).toContain(String(companyReport!.totalIncome));
      expect(sheetXml).toContain(String(companyReport!.totalExpenses));
      expect(sheetXml).toContain(String(companyReport!.profitOrLoss));
    });
  });

  describe('4. EXCEL DOWNLOAD: EACH DRIVER (owner)', () => {
    it('generates a valid .xlsx file containing driver details, vehicles driven, and full trip list for salary', async () => {
      const driverSummary = await dataRepo.getDriverMonthlySummary(testDriverId, month);
      expect(driverSummary).toBeDefined();

      const buffer = generateDriverExcel(driverSummary!, month);
      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(1000);

      const entries = parseZipEntries(buffer);
      expect(entries).toContain('xl/worksheets/sheet1.xml');

      const sheetXml = extractZipFile(buffer, 'xl/worksheets/sheet1.xml');
      expect(sheetXml).toBeDefined();

      // Must contain driver name and phone
      expect(sheetXml).toContain(driverSummary!.driver.full_name);
      expect(sheetXml).toContain(driverSummary!.driver.phone);
      // Must contain salary metrics: trips, days worked, total km
      expect(sheetXml).toContain('Trips This Month');
      expect(sheetXml).toContain('Days Worked');
      expect(sheetXml).toContain('Total KM Run');
      expect(sheetXml).toContain(String(driverSummary!.totalTripsCount));
      expect(sheetXml).toContain(String(driverSummary!.totalDaysWorked));
      expect(sheetXml).toContain(String(driverSummary!.totalKilometers));

      // Must contain Vehicles Driven section
      expect(sheetXml).toContain('VEHICLES DRIVEN THIS MONTH');
      expect(sheetXml).toContain('Trips Driven');
      expect(sheetXml).toContain('Total KM Run');

      // Must contain Full Trip List section
      expect(sheetXml).toContain('FULL TRIP LIST FOR SALARY CALCULATION');
      expect(sheetXml).toContain('Date');
      expect(sheetXml).toContain('Start KM');
      expect(sheetXml).toContain('End KM');
      expect(sheetXml).toContain('KM Run');
    });
  });
});
