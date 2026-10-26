// src/lib/firebase/sync.ts
import { db, isFirebaseConfigured } from './config';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  DocumentData,
} from 'firebase/firestore';
import type { FleetState } from '@/lib/data-service';

/**
 * Synchronize local fleet state to Firebase Firestore in real-time.
 */
export async function syncFleetToFirestore(state: FleetState): Promise<boolean> {
  if (!isFirebaseConfigured || !db) {
    return false;
  }

  try {
    const batch = writeBatch(db);

    // 1. Sync Drivers
    for (const d of state.drivers || []) {
      const ref = doc(db, 'drivers', d.id);
      batch.set(ref, {
        id: d.id,
        full_name: d.full_name,
        phone: d.phone,
        pin: d.pin || '1234',
        status: d.status,
        is_active: d.is_active,
        updated_at: d.updated_at || new Date().toISOString(),
      }, { merge: true });
    }

    // 2. Sync Vehicles
    for (const v of state.vehicles || []) {
      const ref = doc(db, 'vehicles', v.id);
      batch.set(ref, {
        id: v.id,
        registration_number: v.registration_number,
        make_model: v.make_model,
        company: v.company || v.company_name || 'Delhivery',
        current_odometer: v.current_odometer,
        status: v.status,
        is_active: v.is_active,
        updated_at: v.updated_at || new Date().toISOString(),
      }, { merge: true });
    }

    // 3. Sync Trips
    for (const t of (state.trips || []).slice(0, 100)) {
      const ref = doc(db, 'trips', t.id);
      batch.set(ref, {
        ...t,
        updated_at: t.updated_at || new Date().toISOString(),
      }, { merge: true });
    }

    // 4. Sync Expenses
    for (const exp of (state.expenses || []).slice(0, 100)) {
      const ref = doc(db, 'expenses', exp.id);
      batch.set(ref, {
        ...exp,
        updated_at: exp.updated_at || new Date().toISOString(),
      }, { merge: true });
    }

    // 5. Sync Settings
    if (state.settings) {
      const ref = doc(db, 'settings', 'fleet_settings');
      batch.set(ref, {
        ...state.settings,
        synced_at: new Date().toISOString(),
      }, { merge: true });
    }

    // 6. Sync Vehicle Incomes
    for (const vi of (state.vehicleIncomes || [])) {
      const ref = doc(db, 'vehicle_incomes', vi.id);
      batch.set(ref, {
        ...vi,
        updated_at: vi.updated_at || new Date().toISOString(),
      }, { merge: true });
    }

    await batch.commit();
    return true;
  } catch (err) {
    console.warn('Firebase Firestore sync failed (check if Firestore database is enabled):', err);
    return false;
  }
}

/**
 * Fetch all drivers from Firestore
 */
export async function fetchDriversFromFirestore(): Promise<any[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(collection(db, 'drivers'));
    const drivers: any[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      if (data && data.id) {
        drivers.push(data);
      }
    });
    return drivers;
  } catch (err) {
    console.warn('Failed to fetch drivers from Firestore:', err);
    return [];
  }
}

/**
 * Fetch driver by phone number directly from Firestore (supports any phone format, checking last 10 digits)
 */
export async function fetchDriverByPhoneFromFirestore(phone: string): Promise<any | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const snap = await getDocs(collection(db, 'drivers'));
    let matched: any = null;
    snap.forEach((doc) => {
      const d = doc.data();
      if (!d) return;
      const dPhoneDigits = String(d.phone || '').replace(/\D/g, '').slice(-10);
      if (dPhoneDigits === cleanPhone && d.is_active !== false && d.is_active !== 0) {
        matched = d;
      }
    });
    return matched;
  } catch (err) {
    console.warn('Failed to find driver by phone in Firestore:', err);
    return null;
  }
}

/**
 * Fetch all vehicles from Firestore
 */
export async function fetchVehiclesFromFirestore(): Promise<any[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(collection(db, 'vehicles'));
    const vehicles: any[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      if (data && data.id) {
        vehicles.push(data);
      }
    });
    return vehicles;
  } catch (err) {
    console.warn('Failed to fetch vehicles from Firestore:', err);
    return [];
  }
}

/**
 * Automatically sync a single driver to Firestore in real-time
 */
export async function syncDriverToFirestore(driver: {
  id: string;
  employee_code?: string;
  full_name?: string;
  fullName?: string;
  phone?: string;
  pin?: string;
  status?: string;
  is_active?: boolean | number;
  allow_next_trip_override?: number;
  [key: string]: any;
}): Promise<boolean> {
  if (!isFirebaseConfigured || !db || !driver?.id) return false;
  try {
    const ref = doc(db, 'drivers', driver.id);
    await setDoc(ref, {
      id: driver.id,
      employee_code: driver.employee_code || '',
      full_name: driver.full_name || driver.fullName || '',
      phone: driver.phone || '',
      pin: driver.pin || '1234',
      status: driver.status || 'idle',
      is_active: driver.is_active !== false && driver.is_active !== 0,
      allow_next_trip_override: driver.allow_next_trip_override ? 1 : 0,
      updated_at: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Auto-sync driver to Firebase failed:', err);
    return false;
  }
}

/**
 * Automatically sync a single vehicle to Firestore in real-time
 */
export async function syncVehicleToFirestore(vehicle: {
  id: string;
  registration_number?: string;
  make_model?: string;
  company?: string;
  current_odometer?: number;
  status?: string;
  is_active?: boolean | number;
  [key: string]: any;
}): Promise<boolean> {
  if (!isFirebaseConfigured || !db || !vehicle?.id) return false;
  try {
    const ref = doc(db, 'vehicles', vehicle.id);
    await setDoc(ref, {
      ...vehicle,
      updated_at: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Auto-sync vehicle to Firebase failed:', err);
    return false;
  }
}

/**
 * Automatically sync a single trip to Firestore in real-time
 */
export async function syncTripToFirestore(trip: {
  id: string;
  [key: string]: any;
}): Promise<boolean> {
  if (!isFirebaseConfigured || !db || !trip?.id) return false;
  try {
    const ref = doc(db, 'trips', trip.id);
    await setDoc(ref, {
      ...trip,
      updated_at: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Auto-sync trip to Firebase failed:', err);
    return false;
  }
}

/**
 * Automatically sync a single expense to Firestore in real-time
 */
export async function syncExpenseToFirestore(expense: {
  id: string;
  [key: string]: any;
}): Promise<boolean> {
  if (!isFirebaseConfigured || !db || !expense?.id) return false;
  try {
    const ref = doc(db, 'expenses', expense.id);
    await setDoc(ref, {
      ...expense,
      updated_at: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Auto-sync expense to Firebase failed:', err);
    return false;
  }
}

/**
 * Automatically sync a single vehicle income to Firestore in real-time
 */
export async function syncVehicleIncomeToFirestore(income: {
  id: string;
  vehicle_id: string;
  month: string;
  amount: number;
  [key: string]: any;
}): Promise<boolean> {
  if (!isFirebaseConfigured || !db || !income?.id) return false;
  try {
    const ref = doc(db, 'vehicle_incomes', income.id);
    await setDoc(ref, {
      ...income,
      updated_at: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Auto-sync vehicle income to Firebase failed:', err);
    return false;
  }
}

/**
 * Subscribe to real-time changes from Firestore
 */
export function subscribeToFirestore(onRemoteChange: () => void): (() => void) | null {
  if (!isFirebaseConfigured || !db) return null;

  try {
    const unsubDrivers = onSnapshot(collection(db, 'drivers'), () => onRemoteChange(), () => {});
    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), () => onRemoteChange(), () => {});
    const unsubTrips = onSnapshot(collection(db, 'trips'), () => onRemoteChange(), () => {});
    return () => {
      unsubDrivers();
      unsubVehicles();
      unsubTrips();
    };
  } catch {
    return null;
  }
}

/**
 * Permanently delete a driver document from Firestore
 */
export async function deleteDriverFromFirestore(driverId: string): Promise<boolean> {
  if (!isFirebaseConfigured || !db || !driverId) return false;
  try {
    await deleteDoc(doc(db, 'drivers', driverId));
    return true;
  } catch (err) {
    console.warn('Failed to delete driver from Firestore:', err);
    return false;
  }
}

/**
 * Permanently delete a vehicle document from Firestore
 */
export async function deleteVehicleFromFirestore(vehicleId: string): Promise<boolean> {
  if (!isFirebaseConfigured || !db || !vehicleId) return false;
  try {
    await deleteDoc(doc(db, 'vehicles', vehicleId));
    return true;
  } catch (err) {
    console.warn('Failed to delete vehicle from Firestore:', err);
    return false;
  }
}

/**
 * Permanently delete a trip document from Firestore
 */
export async function deleteTripFromFirestore(tripId: string): Promise<boolean> {
  if (!isFirebaseConfigured || !db || !tripId) return false;
  try {
    await deleteDoc(doc(db, 'trips', tripId));
    return true;
  } catch (err) {
    console.warn('Failed to delete trip from Firestore:', err);
    return false;
  }
}

/**
 * Permanently delete an expense document from Firestore
 */
export async function deleteExpenseFromFirestore(expenseId: string): Promise<boolean> {
  if (!isFirebaseConfigured || !db || !expenseId) return false;
  try {
    await deleteDoc(doc(db, 'expenses', expenseId));
    return true;
  } catch (err) {
    console.warn('Failed to delete expense from Firestore:', err);
    return false;
  }
}

/**
 * Permanently delete a company document from Firestore (if present)
 */
export async function deleteCompanyFromFirestore(companyId: string): Promise<boolean> {
  if (!isFirebaseConfigured || !db || !companyId) return false;
  try {
    await deleteDoc(doc(db, 'companies', companyId));
    return true;
  } catch (err) {
    console.warn('Failed to delete company from Firestore:', err);
    return false;
  }
}

/**
 * Batch delete multiple documents across collections from Firestore
 */
export async function batchDeleteFromFirestore(
  items: { collection: string; id: string }[]
): Promise<boolean> {
  if (!isFirebaseConfigured || !db || items.length === 0) return false;
  try {
    const batch = writeBatch(db);
    for (const item of items) {
      batch.delete(doc(db, item.collection, item.id));
    }
    await batch.commit();
    return true;
  } catch (err) {
    console.warn('Batch delete from Firestore failed:', err);
    return false;
  }
}
