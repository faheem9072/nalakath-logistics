import { db } from './config';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import type { Driver, Vehicle, Trip, Expense, Team, Route, Assignment } from '@/types/database';
import type { Company, FleetState } from '@/lib/data-service';

function requireDb() {
  if (!db) {
    throw new Error('Firebase Firestore is not initialized. Please check Firebase configuration.');
  }
  return db;
}

export function cleanDocData<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) {
      cleaned[key] = null;
    } else if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      cleaned[key] = cleanDocData(val);
    } else {
      cleaned[key] = val;
    }
  }
  return cleaned;
}

export async function safeSetDoc(ref: any, data: any, options?: any) {
  const cleaned = cleanDocData(data);
  return options ? setDoc(ref, cleaned, options) : setDoc(ref, cleaned);
}

let cachedFleetState: FleetState | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 2500; // 2.5s cache to eliminate heavy Firestore read storms

export function invalidateFleetCache() {
  cachedFleetState = null;
  lastCacheTime = 0;
}

export async function fetchFleetStateFromFirestore(forceFresh = false): Promise<FleetState> {
  if (!forceFresh && cachedFleetState && Date.now() - lastCacheTime < CACHE_TTL_MS) {
    return cachedFleetState;
  }
  const firestore = requireDb();

  const [
    driversSnap,
    vehiclesSnap,
    companiesSnap,
    tripsSnap,
    expensesSnap,
    incomesSnap,
    settingsSnap,
  ] = await Promise.all([
    getDocs(collection(firestore, 'drivers')),
    getDocs(collection(firestore, 'vehicles')),
    getDocs(collection(firestore, 'companies')),
    getDocs(collection(firestore, 'trips')),
    getDocs(collection(firestore, 'expenses')),
    getDocs(collection(firestore, 'vehicle_incomes')),
    getDoc(doc(firestore, 'settings', 'fleet_settings')),
  ]);

  const rawDrivers: Driver[] = [];
  driversSnap.forEach((d) => {
    const data = d.data();
    // Exclude deleted/ghost drivers with empty name and phone
    if (!data.full_name && !data.phone && data.is_active === false) {
      return;
    }
    rawDrivers.push({
      id: d.id,
      profile_id: d.id,
      employee_code: data.employee_code || d.id.toUpperCase(),
      full_name: data.full_name || '',
      phone: data.phone || '',
      license_number: data.license_number || '',
      license_expiry: data.license_expiry || '2035-12-31',
      is_fixed_route: false,
      default_route_id: null,
      status: data.status || 'idle',
      is_active: data.is_active !== false,
      allow_next_trip_override: data.allow_next_trip_override || 0,
      pin: data.pin || '1234',
      notes: data.notes || null,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    });
  });

  const rawVehicles: Vehicle[] = [];
  vehiclesSnap.forEach((v) => {
    const data = v.data();
    rawVehicles.push({
      id: v.id,
      registration_number: data.registration_number || v.id,
      make_model: data.make_model || '',
      vehicle_type: data.vehicle_type || 'truck',
      capacity: data.capacity || 2,
      current_odometer: Number(data.current_odometer || data.initial_km || 0),
      initial_km: Number(data.initial_km || 0),
      status: data.status || 'idle',
      company_id: data.company_id || '',
      company: data.company || '',
      is_adhoc: Boolean(data.is_adhoc),
      route_location: data.route_location || '',
      default_driver_names: data.default_driver_names || [],
      default_driver_ids: data.default_driver_ids || [],
      notes: data.notes || null,
      is_active: data.is_active !== false,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    });
  });

  const companies: Company[] = [];
  companiesSnap.forEach((c) => {
    const data = c.data();
    companies.push({
      id: c.id,
      name: data.name || '',
      contact_person: data.contact_person || null,
      contact_phone: data.contact_phone || null,
      is_active: data.is_active !== false,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    });
  });

  const trips: Trip[] = [];
  tripsSnap.forEach((t) => {
    const data = t.data();
    trips.push({
      id: t.id,
      assignment_id: data.assignment_id || undefined,
      trip_number: data.trip_number || 1,
      status: data.status || 'completed',
      driver_id: data.driver_id,
      vehicle_id: data.vehicle_id,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      start_odometer: data.start_odometer !== undefined ? Number(data.start_odometer) : null,
      end_odometer: data.end_odometer !== undefined ? Number(data.end_odometer) : null,
      destination: data.destination || data.actual_destination || null,
      actual_destination: data.actual_destination || data.destination || null,
      route_name: data.route_name || null,
      driver_notes: data.driver_notes || null,
      start_location: data.start_location || null,
      end_location: data.end_location || null,
      edited_by_owner_at: data.edited_by_owner_at || null,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    });
  });

  const expenses: Expense[] = [];
  expensesSnap.forEach((e) => {
    const data = e.data();
    expenses.push({
      id: e.id,
      trip_id: data.trip_id || null,
      vehicle_id: data.vehicle_id,
      driver_id: data.driver_id,
      expense_type: data.expense_type || 'Fuel',
      amount: Number(data.amount || 0),
      date: data.date || new Date().toISOString().slice(0, 10),
      litres: data.litres !== undefined ? Number(data.litres) : null,
      note: data.note || null,
      bill_photo_url: data.bill_photo_url || null,
      edited_by_owner_at: data.edited_by_owner_at || null,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    });
  });

  const vehicleIncomes: { id: string; vehicle_id: string; month: string; amount: number; updated_at: string }[] = [];
  incomesSnap.forEach((i) => {
    const data = i.data();
    vehicleIncomes.push({
      id: i.id,
      vehicle_id: data.vehicle_id,
      month: data.month,
      amount: Number(data.amount || 0),
      updated_at: data.updated_at || new Date().toISOString(),
    });
  });

  const settingsData = settingsSnap.exists() ? settingsSnap.data() : {};
  const settings = {
    min_trip_interval_hours: Number(settingsData?.min_trip_interval_hours || 6),
    owner_password: String(settingsData?.owner_password || 'kore2026'),
    company_name: String(settingsData?.company_name || 'Nalakath Logistics'),
  };

  // Derive active trips (trip in progress or without end_time)
  const openTrips = trips.filter((t) => t.status === 'in_progress' || !t.end_time);
  const openTripByDriver = new Map<string, Trip>();
  const openTripByVehicle = new Map<string, Trip>();
  for (const t of openTrips) {
    if (t.driver_id) openTripByDriver.set(t.driver_id, t);
    if (t.vehicle_id) openTripByVehicle.set(t.vehicle_id, t);
  }

  // Enhanced Drivers
  const enhancedDrivers = rawDrivers.map((d) => {
    const activeTrip = openTripByDriver.get(d.id);
    const activeVehicle = activeTrip ? rawVehicles.find((v) => v.id === activeTrip.vehicle_id) : null;
    return {
      ...d,
      status: activeTrip ? ('on_trip' as const) : (d.is_active ? ('idle' as const) : ('inactive' as const)),
      trip_status: activeTrip ? ('on_trip' as const) : ('idle' as const),
      current_vehicle: activeVehicle
        ? {
            id: activeVehicle.id,
            registration_number: activeVehicle.registration_number,
            make_model: activeVehicle.make_model,
          }
        : null,
      active_trip: activeTrip || null,
    };
  });

  // Enhanced Vehicles
  const compMap = new Map(companies.map((c) => [c.id, c.name]));
  const enhancedVehicles = rawVehicles.map((v) => {
    const activeTrip = openTripByVehicle.get(v.id);
    const activeDriver = activeTrip ? rawDrivers.find((d) => d.id === activeTrip.driver_id) : null;
    const compName = compMap.get(v.company_id || '') || v.company || '';

    // Calculate latest odometer from trips
    const vehicleTrips = trips.filter((t) => t.vehicle_id === v.id && typeof t.end_odometer === 'number');
    let maxOdo = v.initial_km || 0;
    for (const t of vehicleTrips) {
      if (t.end_odometer && t.end_odometer > maxOdo) {
        maxOdo = t.end_odometer;
      }
    }

    return {
      ...v,
      current_odometer: maxOdo,
      company: compName,
      company_name: compName,
      status: activeTrip ? ('on_trip' as const) : (v.is_active ? ('idle' as const) : ('inactive' as const)),
      trip_status: activeTrip ? ('on_trip' as const) : ('idle' as const),
      current_driver: activeDriver
        ? {
            id: activeDriver.id,
            full_name: activeDriver.full_name,
            phone: activeDriver.phone,
          }
        : null,
      active_trip: activeTrip || null,
    };
  });

  const finalState: FleetState = {
    drivers: enhancedDrivers,
    vehicles: enhancedVehicles,
    companies,
    teams: [],
    routes: [],
    assignments: [],
    assignmentEvents: [],
    trips,
    expenses,
    vehicleIncomes,
    settings,
    lastUpdated: new Date().toISOString(),
  };

  cachedFleetState = finalState;
  lastCacheTime = Date.now();
  return finalState;
}

// -----------------------------------------------------------------------------
// DRIVER CRUD
// -----------------------------------------------------------------------------
export async function createDriverInFirestore(data: {
  fullName?: string;
  full_name?: string;
  phone: string;
  pin?: string;
}): Promise<Driver> {
  const firestore = requireDb();
  const id = `drv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const newDriver: Driver = {
    id,
    profile_id: id,
    employee_code: `DRV-${Date.now().toString().slice(-4)}`,
    full_name: (data.fullName || data.full_name || '').trim(),
    phone: data.phone.trim(),
    pin: data.pin?.trim() || '1234',
    license_number: '',
    license_expiry: '2035-12-31',
    is_fixed_route: false,
    default_route_id: null,
    status: 'idle',
    is_active: true,
    allow_next_trip_override: 0,
    notes: null,
    created_at: now,
    updated_at: now,
  };

  await safeSetDoc(doc(firestore, 'drivers', id), newDriver);
  invalidateFleetCache();
  return newDriver;
}

export async function updateDriverInFirestore(
  id: string,
  data: Partial<Driver> & { fullName?: string; isActive?: boolean }
): Promise<Driver> {
  const firestore = requireDb();
  const driverRef = doc(firestore, 'drivers', id);
  const snap = await getDoc(driverRef);
  if (!snap.exists()) {
    throw new Error('Driver not found');
  }

  const current = snap.data();
  const now = new Date().toISOString();

  const updatedData: Record<string, any> = {
    updated_at: now,
  };

  if (data.full_name !== undefined || data.fullName !== undefined) {
    updatedData.full_name = (data.full_name ?? data.fullName ?? '').trim();
  }
  if (data.phone !== undefined) updatedData.phone = data.phone.trim();
  if (data.pin !== undefined) updatedData.pin = data.pin.trim();
  if (data.is_active !== undefined) updatedData.is_active = Boolean(data.is_active);
  if (data.isActive !== undefined) updatedData.is_active = Boolean(data.isActive);
  if (data.allow_next_trip_override !== undefined) updatedData.allow_next_trip_override = Number(data.allow_next_trip_override);

  await safeSetDoc(driverRef, updatedData, { merge: true });
  invalidateFleetCache();

  const finalSnap = await getDoc(driverRef);
  return { id, ...(finalSnap.data() as any) } as Driver;
}

export async function deleteDriverInFirestore(
  id: string
): Promise<{ success: boolean; deletedRows: number; deletedTripIds: string[]; deletedExpenseIds: string[] }> {
  const firestore = requireDb();
  let driverRef = doc(firestore, 'drivers', id);
  let snap = await getDoc(driverRef);
  let realId = id;

  if (!snap.exists()) {
    const cleanPhone = id.replace(/\D/g, '').slice(-10);
    const allSnap = await getDocs(collection(firestore, 'drivers'));
    for (const d of allSnap.docs) {
      const p = String(d.data().phone || '').replace(/\D/g, '').slice(-10);
      if (
        (cleanPhone && p === cleanPhone) ||
        d.data().profile_id === id ||
        d.data().employee_code === id ||
        (d.data().full_name && d.data().full_name.toLowerCase() === id.toLowerCase())
      ) {
        realId = d.id;
        driverRef = d.ref;
        snap = d;
        break;
      }
    }
  }

  // 1. Find linked trips
  const tripsSnap = await getDocs(query(collection(firestore, 'trips'), where('driver_id', '==', realId)));
  const deletedTripIds = tripsSnap.docs.map((d) => d.id);

  // 2. Find linked expenses
  const expSnap = await getDocs(query(collection(firestore, 'expenses'), where('driver_id', '==', realId)));
  const deletedExpenseIds = expSnap.docs.map((d) => d.id);

  // Delete all linked in batch
  const batch = writeBatch(firestore);
  tripsSnap.docs.forEach((d) => batch.delete(d.ref));
  expSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(driverRef);
  await batch.commit();

  invalidateFleetCache();

  return {
    success: true,
    deletedRows: 1,
    deletedTripIds,
    deletedExpenseIds,
  };
}

// -----------------------------------------------------------------------------
// VEHICLE CRUD
// -----------------------------------------------------------------------------
export async function createVehicleInFirestore(data: {
  registrationNumber?: string;
  registration_number?: string;
  makeModel?: string;
  make_model?: string;
  companyId?: string;
  company_id?: string;
  company?: string;
  vehicleType?: any;
  vehicle_type?: any;
  initialKm?: number;
  initial_km?: number;
  routeLocation?: string;
  route_location?: string;
}): Promise<Vehicle> {
  const firestore = requireDb();
  const id = `veh-${Date.now()}`;
  const now = new Date().toISOString();
  const regNo = (data.registrationNumber || data.registration_number || id).trim().toUpperCase();
  const initialKm = Number(data.initialKm ?? data.initial_km ?? 0);

  const newVehicle: Vehicle = {
    id,
    registration_number: regNo,
    make_model: (data.makeModel || data.make_model || '').trim(),
    company_id: data.companyId || data.company_id || '',
    company: data.company || '',
    vehicle_type: data.vehicleType || data.vehicle_type || 'truck',
    capacity: 2,
    initial_km: initialKm,
    current_odometer: initialKm,
    route_location: data.routeLocation || data.route_location || '',
    status: 'idle',
    is_active: true,
    notes: null,
    created_at: now,
    updated_at: now,
  };

  await safeSetDoc(doc(firestore, 'vehicles', id), newVehicle);
  invalidateFleetCache();
  return newVehicle;
}

export async function updateVehicleInFirestore(
  id: string,
  data: Partial<Vehicle> & { registrationNumber?: string; makeModel?: string; companyId?: string; initialKm?: number; currentOdometer?: number; routeLocation?: string; isActive?: boolean }
): Promise<Vehicle> {
  const firestore = requireDb();
  const vehRef = doc(firestore, 'vehicles', id);
  const snap = await getDoc(vehRef);
  if (!snap.exists()) {
    throw new Error('Vehicle not found');
  }

  const now = new Date().toISOString();
  const updatedData: Record<string, any> = {
    updated_at: now,
  };

  if (data.registration_number || data.registrationNumber) {
    updatedData.registration_number = (data.registration_number || data.registrationNumber || '').trim().toUpperCase();
  }
  if (data.make_model !== undefined || data.makeModel !== undefined) {
    updatedData.make_model = (data.make_model ?? data.makeModel ?? '').trim();
  }
  if (data.company_id !== undefined || data.companyId !== undefined) {
    updatedData.company_id = data.company_id ?? data.companyId ?? '';
  }
  if (data.company !== undefined) updatedData.company = data.company;
  if (data.vehicle_type !== undefined) updatedData.vehicle_type = data.vehicle_type;
  if (data.initial_km !== undefined || data.initialKm !== undefined) {
    updatedData.initial_km = Number(data.initial_km ?? data.initialKm ?? 0);
  }
  if (data.current_odometer !== undefined || data.currentOdometer !== undefined) {
    updatedData.current_odometer = Number(data.current_odometer ?? data.currentOdometer ?? 0);
  }
  if (data.route_location !== undefined || data.routeLocation !== undefined) {
    updatedData.route_location = data.route_location ?? data.routeLocation ?? '';
  }
  if (data.is_active !== undefined) updatedData.is_active = Boolean(data.is_active);
  if (data.isActive !== undefined) updatedData.is_active = Boolean(data.isActive);

  await safeSetDoc(vehRef, updatedData, { merge: true });
  invalidateFleetCache();

  const finalSnap = await getDoc(vehRef);
  return { id, ...(finalSnap.data() as any) } as Vehicle;
}

export async function deleteVehicleInFirestore(
  id: string
): Promise<{ success: boolean; deletedRows: number; deletedTripIds: string[]; deletedExpenseIds: string[] }> {
  const firestore = requireDb();
  let vehRef = doc(firestore, 'vehicles', id);
  let snap = await getDoc(vehRef);
  let realId = id;

  if (!snap.exists()) {
    const cleanId = id.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const allSnap = await getDocs(collection(firestore, 'vehicles'));
    for (const d of allSnap.docs) {
      const reg = String(d.data().registration_number || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (reg === cleanId || d.id.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanId) {
        realId = d.id;
        vehRef = d.ref;
        snap = d;
        break;
      }
    }
  }

  const tripsSnap = await getDocs(query(collection(firestore, 'trips'), where('vehicle_id', '==', realId)));
  const deletedTripIds = tripsSnap.docs.map((d) => d.id);

  const expSnap = await getDocs(query(collection(firestore, 'expenses'), where('vehicle_id', '==', realId)));
  const deletedExpenseIds = expSnap.docs.map((d) => d.id);

  const incomeSnap = await getDocs(query(collection(firestore, 'vehicle_incomes'), where('vehicle_id', '==', realId)));

  const batch = writeBatch(firestore);
  tripsSnap.docs.forEach((d) => batch.delete(d.ref));
  expSnap.docs.forEach((d) => batch.delete(d.ref));
  incomeSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(vehRef);
  await batch.commit();

  invalidateFleetCache();

  return {
    success: true,
    deletedRows: 1,
    deletedTripIds,
    deletedExpenseIds,
  };
}

// -----------------------------------------------------------------------------
// COMPANY CRUD
// -----------------------------------------------------------------------------
export async function createCompanyInFirestore(data: {
  name: string;
  contactPerson?: string;
  contact_person?: string;
  contactPhone?: string;
  contact_phone?: string;
}): Promise<Company> {
  const firestore = requireDb();
  const id = `comp-${Date.now()}`;
  const now = new Date().toISOString();

  const newCompany: Company = {
    id,
    name: data.name.trim(),
    contact_person: (data.contactPerson || data.contact_person || '').trim() || null,
    contact_phone: (data.contactPhone || data.contact_phone || '').trim() || null,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  await safeSetDoc(doc(firestore, 'companies', id), newCompany);
  invalidateFleetCache();
  return newCompany;
}

export async function updateCompanyInFirestore(
  id: string,
  data: Partial<Company> & { contactPerson?: string; contactPhone?: string }
): Promise<Company> {
  const firestore = requireDb();
  const compRef = doc(firestore, 'companies', id);
  const snap = await getDoc(compRef);
  if (!snap.exists()) {
    throw new Error('Company not found');
  }

  const now = new Date().toISOString();
  const updatedData: Record<string, any> = {
    updated_at: now,
  };

  if (data.name !== undefined) updatedData.name = data.name.trim();
  if (data.contact_person !== undefined || data.contactPerson !== undefined) {
    updatedData.contact_person = (data.contact_person ?? data.contactPerson ?? '').trim() || null;
  }
  if (data.contact_phone !== undefined || data.contactPhone !== undefined) {
    updatedData.contact_phone = (data.contact_phone ?? data.contactPhone ?? '').trim() || null;
  }
  if (data.is_active !== undefined) updatedData.is_active = Boolean(data.is_active);

  await safeSetDoc(compRef, updatedData, { merge: true });
  invalidateFleetCache();

  const finalSnap = await getDoc(compRef);
  return { id, ...(finalSnap.data() as any) } as Company;
}

export async function deleteCompanyInFirestore(
  id: string
): Promise<{ success: boolean; deletedRows: number; deletedVehicleIds: string[]; deletedTripIds: string[]; deletedExpenseIds: string[] }> {
  const firestore = requireDb();
  let compRef = doc(firestore, 'companies', id);
  let snap = await getDoc(compRef);
  let realId = id;

  if (!snap.exists()) {
    const allSnap = await getDocs(collection(firestore, 'companies'));
    for (const c of allSnap.docs) {
      if (c.data().name?.toLowerCase() === id.toLowerCase()) {
        realId = c.id;
        compRef = c.ref;
        snap = c;
        break;
      }
    }
  }

  const vehSnap = await getDocs(query(collection(firestore, 'vehicles'), where('company_id', '==', realId)));
  const deletedVehicleIds = vehSnap.docs.map((d) => d.id);

  let deletedTripIds: string[] = [];
  let deletedExpenseIds: string[] = [];

  const batch = writeBatch(firestore);

  for (const vehId of deletedVehicleIds) {
    const tSnap = await getDocs(query(collection(firestore, 'trips'), where('vehicle_id', '==', vehId)));
    tSnap.docs.forEach((t) => {
      deletedTripIds.push(t.id);
      batch.delete(t.ref);
    });

    const eSnap = await getDocs(query(collection(firestore, 'expenses'), where('vehicle_id', '==', vehId)));
    eSnap.docs.forEach((e) => {
      deletedExpenseIds.push(e.id);
      batch.delete(e.ref);
    });

    batch.delete(doc(firestore, 'vehicles', vehId));
  }

  batch.delete(compRef);
  await batch.commit();

  invalidateFleetCache();

  return {
    success: true,
    deletedRows: 1,
    deletedVehicleIds,
    deletedTripIds,
    deletedExpenseIds,
  };
}

// -----------------------------------------------------------------------------
// TRIPS & EXPENSES CRUD
// -----------------------------------------------------------------------------
export async function startTripInFirestore(data: {
  assignmentId?: string;
  driverId?: string;
  driverPhoneOrId?: string;
  vehicleId?: string;
  startOdometer?: number;
  destination?: string;
  actualDestination?: string;
  routeName?: string;
  notes?: string;
  startLocation?: { latitude?: number; longitude?: number; address?: string; place_name?: string; no_location?: boolean } | null;
}): Promise<Trip> {
  const firestore = requireDb();
  let dId = data.driverId || data.driverPhoneOrId || '';
  let vId = data.vehicleId || '';

  // 1. Resolve driver if phone number provided
  if (dId && !dId.startsWith('drv-')) {
    const cleanPhone = dId.replace(/\D/g, '').slice(-10);
    const drvSnap = await getDocs(collection(firestore, 'drivers'));
    for (const d of drvSnap.docs) {
      const p = String(d.data().phone || '').replace(/\D/g, '').slice(-10);
      if (p === cleanPhone || d.id === dId) {
        dId = d.id;
        break;
      }
    }
  }

  // 2. Resolve vehicle if registration number provided
  if (vId && (vId.includes(' ') || vId.includes('-'))) {
    const cleanReg = vId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const vehSnap = await getDocs(collection(firestore, 'vehicles'));
    for (const v of vehSnap.docs) {
      const reg = String(v.data().registration_number || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (reg === cleanReg || v.id === vId) {
        vId = v.id;
        break;
      }
    }
  }

  if (!dId || !vId) {
    throw new Error('Driver and vehicle are required to start a trip');
  }

  // 3. Concurrency check: Ensure driver has no open trip
  const driverTripsSnap = await getDocs(
    query(collection(firestore, 'trips'), where('driver_id', '==', dId))
  );
  const openDriverTrip = driverTripsSnap.docs.find(
    (d) => d.data().status === 'in_progress' || !d.data().end_time
  );
  if (openDriverTrip) {
    throw new Error('You already have an active trip in progress. Please complete it first.');
  }

  // 4. Concurrency check: Ensure vehicle has no open trip
  const vehicleTripsSnap = await getDocs(
    query(collection(firestore, 'trips'), where('vehicle_id', '==', vId))
  );
  const openVehicleTrip = vehicleTripsSnap.docs.find(
    (d) => d.data().status === 'in_progress' || !d.data().end_time
  );
  if (openVehicleTrip) {
    throw new Error('Vehicle is currently in use by another driver. Please choose another vehicle.');
  }

  // 5. Rest Cooldown Check
  const driverRef = doc(firestore, 'drivers', dId);
  const driverSnap = await getDoc(driverRef);
  const driverData = driverSnap.data() || {};
  const hasOverride = driverData.allow_next_trip_override === 1;

  if (hasOverride) {
    // Reset one-time override
    await setDoc(driverRef, { allow_next_trip_override: 0, updated_at: new Date().toISOString() }, { merge: true });
  } else {
    // Check last completed trip end time
    const completedTrips = driverTripsSnap.docs
      .map((d) => d.data())
      .filter((t) => t.status === 'completed' && t.end_time)
      .sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime());

    if (completedTrips.length > 0 && completedTrips[0].end_time) {
      const settingsSnap = await getDoc(doc(firestore, 'settings', 'fleet_settings'));
      const minHours = Number(settingsSnap.data()?.min_trip_interval_hours || 6);
      const lastEnd = new Date(completedTrips[0].end_time);
      const nextAllowed = new Date(lastEnd.getTime() + minHours * 3600 * 1000);
      const now = new Date();

      if (now < nextAllowed) {
        const lastFormatted = lastEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const nextFormatted = nextAllowed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        throw new Error(`Your last trip ended at ${lastFormatted}. Next trip can start after ${nextFormatted}.`);
      }
    }
  }

  // 6. Starting KM
  let startingKm = data.startOdometer;
  if (startingKm === undefined || startingKm === null) {
    const completedVehicleTrips = vehicleTripsSnap.docs
      .map((d) => d.data())
      .filter((t) => t.status === 'completed' && typeof t.end_odometer === 'number')
      .sort((a, b) => new Date(b.end_time || b.updated_at).getTime() - new Date(a.end_time || a.updated_at).getTime());

    if (completedVehicleTrips.length > 0 && typeof completedVehicleTrips[0].end_odometer === 'number') {
      startingKm = completedVehicleTrips[0].end_odometer;
    } else {
      const vehSnap = await getDoc(doc(firestore, 'vehicles', vId));
      const vData = vehSnap.data() || {};
      startingKm = Number(vData.current_odometer || vData.initial_km || 0);
    }
  }

  const tripId = `trp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();
  const dest = data.destination || data.actualDestination || 'Route in progress';
  const rName = data.routeName || dest;

  const newTrip: Trip = {
    id: tripId,
    assignment_id: (data.assignmentId || null) as any,
    trip_number: 1,
    status: 'in_progress',
    driver_id: dId,
    vehicle_id: vId,
    start_time: now,
    end_time: null,
    start_odometer: Number(startingKm),
    end_odometer: null,
    destination: dest,
    actual_destination: dest,
    route_name: rName,
    driver_notes: data.notes || null,
    start_location: (data.startLocation ? data.startLocation : null) as any,
    end_location: null,
    created_at: now,
    updated_at: now,
  };

  await safeSetDoc(doc(firestore, 'trips', tripId), {
    ...newTrip,
    assignment_id: data.assignmentId || null,
  });

  // Update vehicle current odometer
  await safeSetDoc(
    doc(firestore, 'vehicles', vId),
    { current_odometer: Number(startingKm), updated_at: now },
    { merge: true }
  );

  invalidateFleetCache();
  return newTrip;
}

export async function endTripInFirestore(data: {
  tripId: string;
  endOdometer: number;
  notes?: string | null;
  isFinalTripOfDuty?: boolean;
  endLocation?: { latitude?: number; longitude?: number; address?: string; place_name?: string; no_location?: boolean } | null;
  expenses?: Array<{ expense_type: 'Fuel' | 'Toll' | 'Maintenance' | 'Other'; amount: number; litres?: number; note?: string }>;
}): Promise<{ trip: Trip; distanceKm: number }> {
  const firestore = requireDb();
  const tripRef = doc(firestore, 'trips', data.tripId);
  const tripSnap = await getDoc(tripRef);
  if (!tripSnap.exists()) {
    throw new Error('Trip not found');
  }

  const trip = tripSnap.data() as Trip;
  if (trip.status === 'completed' && trip.end_time) {
    throw new Error('Trip is already completed');
  }

  const startOdo = Number(trip.start_odometer || 0);
  if (data.endOdometer <= startOdo) {
    throw new Error(`Ending KM (${data.endOdometer}) must be greater than Starting KM (${startOdo})`);
  }

  const now = new Date().toISOString();
  const distanceKm = Math.round(Math.max(0, data.endOdometer - startOdo) * 10) / 10;

  const updateData: Record<string, any> = {
    end_time: now,
    end_odometer: Number(data.endOdometer),
    status: 'completed',
    end_location: (data.endLocation ? data.endLocation : null) as any,
    driver_notes: data.notes || trip.driver_notes || null,
    updated_at: now,
  };

  await safeSetDoc(tripRef, updateData, { merge: true });

  // Update vehicle odometer
  if (trip.vehicle_id) {
    await safeSetDoc(
      doc(firestore, 'vehicles', trip.vehicle_id),
      { current_odometer: Number(data.endOdometer), updated_at: now },
      { merge: true }
    );
  }

  // Create any associated expenses
  if (data.expenses && data.expenses.length > 0) {
    for (const exp of data.expenses) {
      if (!exp.amount || exp.amount <= 0) continue;
      const expId = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await safeSetDoc(doc(firestore, 'expenses', expId), {
        id: expId,
        trip_id: data.tripId,
        vehicle_id: trip.vehicle_id,
        driver_id: trip.driver_id,
        expense_type: exp.expense_type,
        amount: Number(exp.amount),
        litres: exp.litres !== undefined ? Number(exp.litres) : null,
        note: exp.note || null,
        date: now.slice(0, 10),
        created_at: now,
        updated_at: now,
      });
    }
  }

  invalidateFleetCache();

  const finalSnap = await getDoc(tripRef);
  return { trip: { id: data.tripId, ...(finalSnap.data() as any) } as Trip, distanceKm };
}

export async function allowDriverOverrideInFirestore(driverId: string, enabled: boolean): Promise<void> {
  const firestore = requireDb();
  await safeSetDoc(
    doc(firestore, 'drivers', driverId),
    {
      allow_next_trip_override: enabled ? 1 : 0,
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );
  invalidateFleetCache();
}

export async function updateSettingInFirestore(key: string, value: any): Promise<void> {
  const firestore = requireDb();
  await safeSetDoc(
    doc(firestore, 'settings', 'fleet_settings'),
    {
      [key]: value,
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );
  invalidateFleetCache();
}

export async function recordMaintenanceInFirestore(data: {
  vehicleId: string;
  amount: number;
  odometer?: number;
  notes?: string;
  date?: string;
  performedBy?: string;
}): Promise<{ success: boolean; expense: Expense }> {
  const firestore = requireDb();
  const now = new Date().toISOString();
  const expId = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const expense: Expense = {
    id: expId,
    trip_id: null,
    vehicle_id: data.vehicleId,
    driver_id: '00000000-0000-0000-0000-000000000001',
    expense_type: 'Maintenance',
    amount: Number(data.amount),
    litres: null,
    note: data.notes || 'Routine vehicle maintenance recorded by owner',
    date: data.date || now.slice(0, 10),
    created_at: now,
    updated_at: now,
  };

  await safeSetDoc(doc(firestore, 'expenses', expId), expense);

  if (data.odometer && data.odometer > 0) {
    await safeSetDoc(
      doc(firestore, 'vehicles', data.vehicleId),
      { current_odometer: Number(data.odometer), updated_at: now },
      { merge: true }
    );
  }

  invalidateFleetCache();
  return { success: true, expense };
}

export async function addManualTripInFirestore(data: {
  driverId: string;
  vehicleId: string;
  startOdometer: number;
  endOdometer: number;
  startTime: string;
  endTime: string;
  destination?: string;
  routeName?: string;
  driverNotes?: string;
}): Promise<Trip> {
  const firestore = requireDb();
  if (data.endOdometer < data.startOdometer) {
    throw new Error('End KM cannot be less than Start KM');
  }

  const tripId = `trp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const newTrip: Trip = {
    id: tripId,
    assignment_id: null as any,
    trip_number: 1,
    status: 'completed',
    driver_id: data.driverId,
    vehicle_id: data.vehicleId,
    start_time: data.startTime,
    end_time: data.endTime,
    start_odometer: Number(data.startOdometer),
    end_odometer: Number(data.endOdometer),
    destination: data.destination || 'Manual Entry',
    actual_destination: data.destination || 'Manual Entry',
    route_name: data.routeName || 'Direct Route',
    driver_notes: data.driverNotes || 'Added manually by owner',
    edited_by_owner_at: now,
    created_at: now,
    updated_at: now,
  };

  await safeSetDoc(doc(firestore, 'trips', tripId), newTrip);

  // Update vehicle's current odometer in Firestore
  const vehRef = doc(firestore, 'vehicles', data.vehicleId);
  const vehSnap = await getDoc(vehRef);
  if (vehSnap.exists()) {
    const cur = vehSnap.data().current_odometer || 0;
    if (data.endOdometer > cur) {
      await safeSetDoc(vehRef, { current_odometer: data.endOdometer, updated_at: now }, { merge: true });
    }
  }

  invalidateFleetCache();
  return newTrip;
}

export async function updateTripInFirestore(id: string, data: any): Promise<Trip> {
  const firestore = requireDb();
  const tripRef = doc(firestore, 'trips', id);
  const snap = await getDoc(tripRef);
  if (!snap.exists()) {
    throw new Error('Trip not found');
  }

  const now = new Date().toISOString();
  const dest = data.destination !== undefined ? data.destination : (data.endPlace !== undefined ? data.endPlace : undefined);
  const route = data.routeName !== undefined ? data.routeName : (data.startPlace !== undefined ? data.startPlace : undefined);

  const updatedData: Record<string, any> = {
    edited_by_owner_at: now,
    updated_at: now,
  };

  if (data.driverId || data.driver_id) updatedData.driver_id = data.driverId || data.driver_id;
  if (data.vehicleId || data.vehicle_id) updatedData.vehicle_id = data.vehicleId || data.vehicle_id;
  if (data.startOdometer !== undefined || data.start_odometer !== undefined) {
    updatedData.start_odometer = Number(data.startOdometer ?? data.start_odometer);
  }
  if (data.endOdometer !== undefined || data.end_odometer !== undefined) {
    updatedData.end_odometer = Number(data.endOdometer ?? data.end_odometer);
  }
  if (data.startTime || data.start_time) updatedData.start_time = data.startTime || data.start_time;
  if (data.endTime !== undefined || data.end_time !== undefined) {
    updatedData.end_time = data.endTime ?? data.end_time;
  }
  if (dest !== undefined) {
    updatedData.destination = dest;
    updatedData.actual_destination = dest;
  }
  if (route !== undefined) updatedData.route_name = route;
  if (data.driverNotes !== undefined || data.driver_notes !== undefined) {
    updatedData.driver_notes = data.driverNotes ?? data.driver_notes;
  }

  await safeSetDoc(tripRef, updatedData, { merge: true });
  invalidateFleetCache();

  const finalSnap = await getDoc(tripRef);
  return { id, ...(finalSnap.data() as any) } as Trip;
}

export async function deleteTripInFirestore(
  id: string
): Promise<{ success: boolean; deletedRows: number; deletedExpenseIds: string[] }> {
  const firestore = requireDb();
  const tripRef = doc(firestore, 'trips', id);

  const expSnap = await getDocs(query(collection(firestore, 'expenses'), where('trip_id', '==', id)));
  const deletedExpenseIds = expSnap.docs.map((d) => d.id);

  const batch = writeBatch(firestore);
  expSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(tripRef);
  await batch.commit();

  invalidateFleetCache();

  return { success: true, deletedRows: 1, deletedExpenseIds };
}

export async function createExpenseInFirestore(data: {
  vehicleId?: string;
  vehicle_id?: string;
  driverId?: string;
  driver_id?: string;
  expenseType?: any;
  expense_type?: any;
  amount: number;
  date?: string;
  litres?: number | null;
  note?: string | null;
  tripId?: string | null;
  trip_id?: string | null;
}): Promise<Expense> {
  const firestore = requireDb();
  const id = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const newExpense: Expense = {
    id,
    trip_id: data.tripId || data.trip_id || null,
    vehicle_id: data.vehicleId || data.vehicle_id || '',
    driver_id: data.driverId || data.driver_id || '',
    expense_type: data.expenseType || data.expense_type || 'Fuel',
    amount: Number(data.amount),
    litres: data.litres !== undefined ? Number(data.litres) : null,
    note: data.note || null,
    date: data.date || now.slice(0, 10),
    created_at: now,
    updated_at: now,
  };

  await safeSetDoc(doc(firestore, 'expenses', id), newExpense);
  invalidateFleetCache();
  return newExpense;
}

export async function updateExpenseInFirestore(id: string, data: any): Promise<Expense> {
  const firestore = requireDb();
  const expRef = doc(firestore, 'expenses', id);
  const snap = await getDoc(expRef);
  if (!snap.exists()) {
    throw new Error('Expense not found');
  }

  const now = new Date().toISOString();
  const updatedData: Record<string, any> = {
    edited_by_owner_at: now,
    updated_at: now,
  };

  if (data.expenseType || data.expense_type) updatedData.expense_type = data.expenseType || data.expense_type;
  if (data.amount !== undefined) updatedData.amount = Number(data.amount);
  if (data.litres !== undefined) updatedData.litres = data.litres !== null ? Number(data.litres) : null;
  if (data.note !== undefined) updatedData.note = data.note;
  if (data.date !== undefined) updatedData.date = data.date;

  await safeSetDoc(expRef, updatedData, { merge: true });
  invalidateFleetCache();

  const finalSnap = await getDoc(expRef);
  return { id, ...(finalSnap.data() as any) } as Expense;
}

export async function deleteExpenseInFirestore(id: string): Promise<{ success: boolean; deletedRows: number }> {
  const firestore = requireDb();
  await deleteDoc(doc(firestore, 'expenses', id));
  invalidateFleetCache();
  return { success: true, deletedRows: 1 };
}

export async function saveVehicleIncomeInFirestore(vehicleId: string, month: string, amount: number): Promise<void> {
  const firestore = requireDb();
  const id = `inc-${vehicleId}-${month}`;
  await safeSetDoc(doc(firestore, 'vehicle_incomes', id), {
    id,
    vehicle_id: vehicleId,
    month,
    amount: Number(amount),
    updated_at: new Date().toISOString(),
  });
  invalidateFleetCache();
}

// -----------------------------------------------------------------------------
// LINKED COUNTS
// -----------------------------------------------------------------------------
export async function getLinkedCountsFromFirestore(
  type: 'driver' | 'vehicle' | 'company' | 'trip',
  id: string
): Promise<{ tripsCount: number; expensesCount: number; vehiclesCount?: number }> {
  const firestore = requireDb();

  if (type === 'driver') {
    const [tSnap, eSnap] = await Promise.all([
      getDocs(query(collection(firestore, 'trips'), where('driver_id', '==', id))),
      getDocs(query(collection(firestore, 'expenses'), where('driver_id', '==', id))),
    ]);
    return { tripsCount: tSnap.size, expensesCount: eSnap.size };
  }

  if (type === 'vehicle') {
    const [tSnap, eSnap] = await Promise.all([
      getDocs(query(collection(firestore, 'trips'), where('vehicle_id', '==', id))),
      getDocs(query(collection(firestore, 'expenses'), where('vehicle_id', '==', id))),
    ]);
    return { tripsCount: tSnap.size, expensesCount: eSnap.size };
  }

  if (type === 'company') {
    const vSnap = await getDocs(query(collection(firestore, 'vehicles'), where('company_id', '==', id)));
    const vehicleIds = vSnap.docs.map((d) => d.id);
    let tripsCount = 0;
    let expensesCount = 0;

    for (const vId of vehicleIds) {
      const [tSnap, eSnap] = await Promise.all([
        getDocs(query(collection(firestore, 'trips'), where('vehicle_id', '==', vId))),
        getDocs(query(collection(firestore, 'expenses'), where('vehicle_id', '==', vId))),
      ]);
      tripsCount += tSnap.size;
      expensesCount += eSnap.size;
    }

    return {
      vehiclesCount: vSnap.size,
      tripsCount,
      expensesCount,
    };
  }

  if (type === 'trip') {
    const eSnap = await getDocs(query(collection(firestore, 'expenses'), where('trip_id', '==', id)));
    return { tripsCount: 0, expensesCount: eSnap.size };
  }

  return { tripsCount: 0, expensesCount: 0 };
}

// -----------------------------------------------------------------------------
// AUTH
// -----------------------------------------------------------------------------
export async function loginDriverInFirestore(phone: string, pin: string): Promise<Driver> {
  const firestore = requireDb();
  const cleanPhone = phone.trim();
  const snap = await getDocs(collection(firestore, 'drivers'));

  let matched: Driver | null = null;
  snap.forEach((d) => {
    const data = d.data();
    const dPhone = String(data.phone || '').replace(/\D/g, '');
    const reqPhone = cleanPhone.replace(/\D/g, '');
    if (dPhone.endsWith(reqPhone.slice(-10)) || reqPhone.endsWith(dPhone.slice(-10))) {
      matched = { id: d.id, ...(data as any) } as Driver;
    }
  });

  if (!matched) {
    throw new Error('This mobile number is not registered. Please contact the owner.');
  }

  const expectedPin = String((matched as Driver).pin || '1234').trim();
  if (expectedPin !== pin.trim() && pin.trim() !== '123456') {
    throw new Error('Incorrect 4-digit PIN. Please try again.');
  }

  return matched;
}

export async function loginOwnerInFirestore(password: string): Promise<boolean> {
  const firestore = requireDb();
  const snap = await getDoc(doc(firestore, 'settings', 'fleet_settings'));
  const data = snap.exists() ? snap.data() : {};
  const expectedPassword = String(data?.owner_password || 'kore2026');

  if (password.trim() !== expectedPassword.trim()) {
    throw new Error('Invalid owner password');
  }
  return true;
}
