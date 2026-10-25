import { describe, it, expect } from 'vitest';
import { dataRepo } from '@/lib/data-service';
import {
  aggregateDriverReport,
  aggregateVehicleReport,
} from '@/lib/utils/report-aggregator';

describe('Nalakath Logistics Demo Updates', () => {
  it('1. SEED DATA: All vehicles belong to Delhivery or Shadowfax with expected rules', async () => {
    const vehicles = await dataRepo.getVehicles();
    expect(vehicles.length).toBe(11);

    const delhiveryVehicles = vehicles.filter((v) => v.company === 'Delhivery');
    const shadowfaxVehicles = vehicles.filter((v) => v.company === 'Shadowfax');

    expect(delhiveryVehicles.length).toBe(7);
    expect(shadowfaxVehicles.length).toBe(4);

    // Delhivery vehicles:
    const v3057 = vehicles.find((v) => v.registration_number === 'KL 84 B 3057')!;
    expect(v3057.is_adhoc).toBe(true);
    expect(v3057.default_driver_names).toContain('Refnise');
    expect(v3057.default_driver_names).toContain('Haneefa');

    const v3443 = vehicles.find((v) => v.registration_number === 'KL 02 BG 3443')!;
    expect(v3443.is_adhoc).toBe(false);
    expect(v3443.route_location).toBe('Mukkam / Pickup Calicut');
    expect(v3443.default_driver_names).toContain('Firoz');

    const v7384 = vehicles.find((v) => v.registration_number === 'KL 57 X 7384')!;
    expect(v7384.route_location).toBe('Ameer, Koyiland, Kizhur | B2B');
    expect(v7384.default_driver_names).toContain('Ameer');

    const v5839 = vehicles.find((v) => v.registration_number === 'KL 24 K 5839')!;
    expect(v5839.route_location).toBe('Thamarassery, Balussery | B2B');
    expect(v5839.default_driver_names).toContain('Basheer');

    const v6587 = vehicles.find((v) => v.registration_number === 'KL 46 M 6587')!;
    expect(v6587.route_location).toBe('Edavanna, Karulai | Cargo pickup');
    expect(v6587.default_driver_names).toContain('Nafi Navas');

    const v2266 = vehicles.find((v) => v.registration_number === 'KL 12 F 2266')!;
    expect(v2266.is_adhoc).toBe(true);
    expect(v2266.route_location).toBe('Areekode, Chungathara');
    expect(v2266.default_driver_names).toContain('Refnise');
    expect(v2266.default_driver_names).toContain('Haneefa');

    const v4474 = vehicles.find((v) => v.registration_number === 'KL 45 F 4474')!;
    expect(v4474.is_adhoc).toBe(true);
    expect(v4474.default_driver_names).toContain('Haneefa');

    // Shadowfax vehicles:
    const v5682 = vehicles.find((v) => v.registration_number === 'KL 08 BP 5682')!;
    expect(v5682.default_driver_names).toContain('Ashin');

    const v5801 = vehicles.find((v) => v.registration_number === 'KL 65 L 5801')!;
    expect(v5801.default_driver_names).toContain('Nandhu');

    const v7543 = vehicles.find((v) => v.registration_number === 'KL 11 BL 7543')!;
    expect(v7543.default_driver_names).toContain('Haris');

    const v1524 = vehicles.find((v) => v.registration_number === 'KL 66 C 1524')!;
    expect(v1524.default_driver_names).toContain('Tirur');
  });

  it('2. OWNER DASHBOARD: Vehicle search with partial match returns detail report', async () => {
    // Partial search "3057"
    const detail3057 = await dataRepo.getVehicleDetail('3057');
    expect(detail3057).not.toBeNull();
    expect(detail3057?.vehicle.registration_number).toBe('KL 84 B 3057');
    expect(detail3057?.company).toBe('Delhivery');
    expect(detail3057?.routeLocation).toBe('Ad-hoc');
    expect(detail3057?.defaultDrivers).toContain('Refnise');
    expect(detail3057?.defaultDrivers).toContain('Haneefa');

    // Drivers who drove this month
    const drivers3057 = detail3057!.driversWhoDrove.map((d) => d.driverName);
    expect(drivers3057).toContain('Refnise');
    expect(drivers3057).toContain('Haneefa');

    // Expenses: fuel ₹2,400 + ₹2,100 = ₹4,500; toll ₹350; maintenance ₹1,800
    expect(detail3057?.expenses.totals.fuel).toBe(4500);
    expect(detail3057?.expenses.totals.toll).toBe(350);
    expect(detail3057?.expenses.totals.maintenance).toBe(1800);
    expect(detail3057?.expenses.totals.grandTotal).toBe(6650);

    // Partial search "5682" (Shadowfax)
    const detail5682 = await dataRepo.getVehicleDetail('5682');
    expect(detail5682?.company).toBe('Shadowfax');
    expect(detail5682?.expenses.totals.fuel).toBe(2600);
    expect(detail5682?.expenses.totals.maintenance).toBe(3200);
    expect(detail5682?.expenses.totals.grandTotal).toBe(5800);

    // Partial search "3443" (KL 02 BG 3443)
    const detail3443 = await dataRepo.getVehicleDetail('3443');
    expect(detail3443?.company).toBe('Delhivery');
    expect(detail3443?.expenses.totals.fuel).toBe(5900); // 3100 + 2800
    expect(detail3443?.expenses.totals.toll).toBe(420);
    expect(detail3443?.expenses.totals.grandTotal).toBe(6320);

    // Partial search "2266" (KL 12 F 2266)
    const detail2266 = await dataRepo.getVehicleDetail('2266');
    expect(detail2266?.company).toBe('Delhivery');
    expect(detail2266?.expenses.totals.fuel).toBe(1950);
    expect(detail2266?.expenses.totals.toll).toBe(210);
    expect(detail2266?.expenses.totals.maintenance).toBe(4500);
    expect(detail2266?.expenses.totals.grandTotal).toBe(6660);
  });

  it('3. DEMO EXPENSE DATA: Other vehicles have no trips/expenses pre-filled', async () => {
    // For example KL 57 X 7384 (Ameer) or KL 65 L 5801 (Nandhu)
    const detail7384 = await dataRepo.getVehicleDetail('7384');
    expect(detail7384?.expenses.entries.length).toBe(0);
    expect(detail7384?.expenses.totals.grandTotal).toBe(0);

    const detail5801 = await dataRepo.getVehicleDetail('5801');
    expect(detail5801?.expenses.entries.length).toBe(0);
    expect(detail5801?.expenses.totals.grandTotal).toBe(0);
  });

  it('4. DRIVER APP: Ad-hoc driver can pick vehicle and route', async () => {
    // Refnise assigns KL 45 F 4474
    const v4474 = (await dataRepo.getVehicles()).find(
      (v) => v.registration_number === 'KL 45 F 4474'
    )!;

    const assigned = await dataRepo.assignDriverAdhocVehicle(
      '+919400112233',
      v4474.id,
      'Ad-hoc Special Feeder'
    );

    expect(assigned.vehicle_id).toBe(v4474.id);
    expect(assigned.notes).toBe('Ad-hoc Special Feeder');
  });

  it('5. DRIVER APP: Driver logs expense and only sees his own entries', async () => {
    const firozPhone = '+919400334455';
    const firozExpensesBefore = await dataRepo.getDriverExpenses(firozPhone);

    // Log a new expense for Firoz
    const v3443 = (await dataRepo.getVehicles()).find(
      (v) => v.registration_number === 'KL 02 BG 3443'
    )!;
    const firozDriver = (await dataRepo.getDrivers()).find(
      (d) => d.full_name === 'Firoz'
    )!;

    const createdExp = await dataRepo.createExpense({
      vehicle_id: v3443.id,
      driver_id: firozDriver.id,
      expense_type: 'Toll',
      amount: 150,
      note: 'New Highway Pass',
    });

    const firozExpensesAfter = await dataRepo.getDriverExpenses(firozPhone);
    expect(firozExpensesAfter.length).toBe(firozExpensesBefore.length + 1);

    // Ashin (+919400778899) does not see Firoz's entries
    const ashinExpenses = await dataRepo.getDriverExpenses('+919400778899');
    for (const exp of ashinExpenses) {
      expect(exp.driver?.phone).toBe('+919400778899');
    }

    // Clean up created expense so it does not affect other tests
    await dataRepo.deleteExpense(createdExp.id);
  });

  it('6. COMPANY FILTER: getReportRawData filters by Delhivery and Shadowfax', async () => {
    const rawAll = await dataRepo.getReportRawData('all');
    expect(rawAll.vehicles.length).toBe(11);

    const rawDelhivery = await dataRepo.getReportRawData('Delhivery');
    expect(rawDelhivery.vehicles.length).toBe(7);
    for (const v of rawDelhivery.vehicles) {
      expect(v.company).toBe('Delhivery');
    }

    const rawShadowfax = await dataRepo.getReportRawData('Shadowfax');
    expect(rawShadowfax.vehicles.length).toBe(4);
    for (const v of rawShadowfax.vehicles) {
      expect(v.company).toBe('Shadowfax');
    }

    // Reports aggregation works with company filter
    const vehReport = aggregateVehicleReport({
      ...rawDelhivery,
      startDate: undefined,
      endDate: undefined,
    });
    expect(vehReport.length).toBe(7);
    for (const vr of vehReport) {
      expect(vr.company).toBe('Delhivery');
    }

    const driverReport = aggregateDriverReport({
      ...rawAll,
      startDate: undefined,
      endDate: undefined,
    });
    expect(driverReport.length).toBeGreaterThan(0);
    // Verifies salary calculation items (totalDutyHours, vehiclesUsed, routesOperated, completedTripsCount)
    const firstDriver = driverReport[0];
    expect(firstDriver).toHaveProperty('assignedDutyDays');
    expect(firstDriver).toHaveProperty('totalDistanceKm');
    expect(firstDriver).toHaveProperty('vehiclesUsed');
    expect(firstDriver).toHaveProperty('routesOperated');
  });
});
