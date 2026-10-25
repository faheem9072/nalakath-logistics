import { describe, it, expect, beforeEach } from 'vitest';
import { fleetDb } from '../src/lib/server/db';
import { fetchDriverByPhoneFromFirestore, syncDriverToFirestore } from '../src/lib/firebase/sync';

describe('Driver Phone Edit, Creation, and Firestore Persistence', () => {
  it('creates driver and verifies credentials can login', () => {
    const testPhone = `9847${Math.floor(100000 + Math.random() * 900000)}`;
    const driver = fleetDb.createDriver({
      fullName: 'Test Firestore Driver',
      phone: testPhone,
      pin: '5678',
    });

    expect(driver.id).toBeDefined();
    expect(driver.phone).toBe(testPhone);

    // Verify local login works
    const loggedIn = fleetDb.loginDriver(testPhone, '5678');
    expect(loggedIn.id).toBe(driver.id);
  });

  it('updates driver phone number and verifies new phone is required for login', () => {
    const originalPhone = `9846${Math.floor(100000 + Math.random() * 900000)}`;
    const newPhone = `9845${Math.floor(100000 + Math.random() * 900000)}`;

    const driver = fleetDb.createDriver({
      fullName: 'Phone Change Driver',
      phone: originalPhone,
      pin: '4321',
    });

    expect(fleetDb.loginDriver(originalPhone, '4321').id).toBe(driver.id);

    // Now update phone number
    const updated = fleetDb.updateDriver(driver.id, {
      phone: newPhone,
    });
    expect(updated.phone).toBe(newPhone);

    // Old phone should no longer be able to log in
    expect(() => fleetDb.loginDriver(originalPhone, '4321')).toThrow(/not registered/);

    // New phone should log in successfully!
    const newLogin = fleetDb.loginDriver(newPhone, '4321');
    expect(newLogin.id).toBe(driver.id);
  });

  it('upserts a driver from remote sync format cleanly', () => {
    const remotePhone = `9899${Math.floor(100000 + Math.random() * 900000)}`;
    const remoteId = `drv-remote-${Date.now()}`;

    fleetDb.upsertDriverRecord({
      id: remoteId,
      full_name: 'Remote Driver Sync',
      phone: remotePhone,
      pin: '9999',
      is_active: 1,
    });

    const driver = fleetDb.getDriver(remoteId);
    expect(driver).toBeDefined();
    expect(driver?.full_name).toBe('Remote Driver Sync');
    expect(driver?.phone).toBe(remotePhone);

    const loginRes = fleetDb.loginDriver(remotePhone, '9999');
    expect(loginRes.id).toBe(remoteId);
  });
});
