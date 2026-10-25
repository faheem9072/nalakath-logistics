// src/lib/firebase/sync.ts
import { db, isFirebaseConfigured } from './config';
import {
  collection,
  doc,
  setDoc,
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

    await batch.commit();
    return true;
  } catch (err) {
    console.warn('Firebase Firestore sync failed (check if Firestore database is enabled):', err);
    return false;
  }
}

/**
 * Automatically sync a single driver to Firestore in real-time
 */
export async function syncDriverToFirestore(driver: {
  id: string;
  full_name?: string;
  phone?: string;
  pin?: string;
  status?: string;
  is_active?: boolean | number;
  [key: string]: any;
}): Promise<boolean> {
  if (!isFirebaseConfigured || !db || !driver?.id) return false;
  try {
    const ref = doc(db, 'drivers', driver.id);
    await setDoc(ref, {
      id: driver.id,
      full_name: driver.full_name,
      phone: driver.phone,
      pin: driver.pin || '1234',
      status: driver.status || 'idle',
      is_active: driver.is_active !== false && driver.is_active !== 0,
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
 * Subscribe to real-time changes from Firestore
 */
export function subscribeToFirestore(onRemoteChange: () => void): (() => void) | null {
  if (!isFirebaseConfigured || !db) return null;

  try {
    const unsubDrivers = onSnapshot(collection(db, 'drivers'), () => onRemoteChange(), () => {});
    const unsubTrips = onSnapshot(collection(db, 'trips'), () => onRemoteChange(), () => {});
    return () => {
      unsubDrivers();
      unsubTrips();
    };
  } catch {
    return null;
  }
}
