import { describe, it, expect } from 'vitest';
import { dataRepo } from '@/lib/data-service';

describe('Simplified Driver Registration & Vehicle Driver Lookup', () => {
  it('registers a new driver with only name and phone, auto-generating employee code and profile', async () => {
    const testPhone = '+919999888877';
    const testName = 'Muhammed Basheer';

    const driver = await dataRepo.createDriver({
      full_name: testName,
      phone: testPhone,
    });

    expect(driver).toBeDefined();
    expect(driver.full_name).toBe(testName);
    expect(driver.phone).toBe(testPhone);
    expect(driver.employee_code).toMatch(/^DRV-\d+/);
    expect(driver.license_number).toBeDefined();
    expect(driver.license_expiry).toBe('2035-12-31');
    expect(driver.status).toBe('active');
    expect(driver.profile_id).not.toBeNull();

    // Verify driver can log in with their phone
    const profile = await dataRepo.loginByPhone(testPhone, '123456');
    expect(profile).toBeDefined();
    expect(profile.phone).toBe(testPhone);
    expect(profile.role).toBe('driver');
  });

  it('looks up a vehicle by registration number and returns today driver and trip status', async () => {
    const vehicles = await dataRepo.getVehicles();
    const firstVehicle = vehicles[0];

    const status = await dataRepo.getVehicleTodayStatus(firstVehicle.registration_number);
    expect(status).not.toBeNull();
    expect(status?.vehicle.id).toBe(firstVehicle.id);
    expect(status?.vehicle.registration_number).toBe(firstVehicle.registration_number);

    // If duty exists today, driver info must be present
    if (status?.hasDutyToday) {
      expect(status.driver).not.toBeNull();
      expect(status.driver?.full_name).toBeDefined();
      expect(status.driver?.phone).toBeDefined();
    }
  });

  it('returns not found or empty duty for non-existent or idle vehicles', async () => {
    const idleSearch = await dataRepo.getVehicleTodayStatus('NON-EXISTENT-BUS');
    expect(idleSearch).toBeNull();
  });
});
