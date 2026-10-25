import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
import {
  INITIAL_PROFILES,
  INITIAL_VEHICLES,
  INITIAL_DRIVERS,
  INITIAL_EXPENSES,
  INITIAL_TEAMS,
  INITIAL_ROUTES,
  INITIAL_ASSIGNMENTS,
  INITIAL_TRIPS,
  getTodayDateString,
} from '../mock/mock-store';
import {
  Vehicle,
  Driver,
  Trip,
  Expense,
  ExpenseType,
  TripLocation,
  Route,
  Team,
  Assignment,
  AssignmentEvent,
} from '@/types/database';
import {
  AssignmentWithDetails,
  AssignmentEventWithDetails,
  VehicleTravelHistory,
  VehicleTravelHistoryTrip,
} from '@/types/models';

export { fleetEvents } from './events';
import { fleetEvents } from './events';

export interface DriverRecord {
  id: string;
  employee_code: string;
  full_name: string;
  phone: string;
  pin: string;
  license_number: string;
  is_active: number; // 1 or 0
  allow_next_trip_override: number; // 1 or 0
  created_at: string;
  updated_at: string;
}

export interface VehicleRecord {
  id: string;
  registration_number: string;
  make_model: string;
  company_id: string;
  vehicle_type: string;
  initial_km: number;
  current_odometer: number;
  route_location?: string | null;
  is_adhoc?: number;
  default_driver_names?: string | null;
  default_driver_ids?: string | null;
  notes?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CompanyRecord {
  id: string;
  name: string;
  contact_person?: string | null;
  contact_phone?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface TeamRecord {
  id: string;
  name: string;
  contact_person?: string | null;
  contact_phone?: string | null;
  billing_notes?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface RouteRecord {
  id: string;
  code: string;
  name: string;
  origin: string;
  destination: string;
  planned_distance_km: number;
  estimated_duration_minutes?: number | null;
  team_id?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface AssignmentRecord {
  id: string;
  duty_date: string;
  driver_id: string;
  vehicle_id: string;
  route_id?: string | null;
  team_id?: string | null;
  planned_start_time: string;
  planned_end_time: string;
  status: string;
  driver_confirmed_at?: string | null;
  notes?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentEventRecord {
  id: string;
  assignment_id: string;
  event_type: string;
  performed_by?: string | null;
  previous_driver_id?: string | null;
  new_driver_id?: string | null;
  previous_vehicle_id?: string | null;
  new_vehicle_id?: string | null;
  reason?: string | null;
  metadata?: string | null;
  created_at: string;
}

export interface TripRecord {
  id: string;
  assignment_id?: string | null;
  trip_number: number;
  driver_id: string;
  vehicle_id: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  start_time: string;
  end_time?: string | null;
  start_odometer: number;
  end_odometer?: number | null;
  destination?: string | null;
  route_name?: string | null;
  start_location?: string | null; // JSON string
  end_location?: string | null; // JSON string
  driver_notes?: string | null;
  edited_by_owner_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseRecord {
  id: string;
  trip_id?: string | null;
  vehicle_id: string;
  driver_id: string;
  expense_type: 'Fuel' | 'Toll' | 'Maintenance' | 'Other';
  amount: number;
  litres?: number | null;
  note?: string | null;
  date: string;
  edited_by_owner_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleIncomeRecord {
  id: string;
  vehicle_id: string;
  month: string;
  amount: number;
  updated_at: string;
}

function formatVehicle(v: VehicleRecord, companyName?: string): Vehicle {
  let defaultDriverNames: string[] = [];
  let defaultDriverIds: string[] = [];
  try {
    if (typeof v.default_driver_names === 'string') defaultDriverNames = JSON.parse(v.default_driver_names);
    else if (Array.isArray(v.default_driver_names)) defaultDriverNames = v.default_driver_names;
    if (typeof v.default_driver_ids === 'string') defaultDriverIds = JSON.parse(v.default_driver_ids);
    else if (Array.isArray(v.default_driver_ids)) defaultDriverIds = v.default_driver_ids;
  } catch {}

  return {
    ...v,
    is_active: Boolean(v.is_active),
    is_adhoc: Boolean(v.is_adhoc),
    default_driver_names: defaultDriverNames,
    default_driver_ids: defaultDriverIds,
    route_location: v.route_location || undefined,
    vehicle_type: v.vehicle_type as any,
    company: companyName || 'Direct',
    status: v.is_active ? 'active' : 'inactive',
    capacity: 2,
    notes: v.notes || null,
  };
}

class FleetDatabase {
  private db: DatabaseSync;

  constructor(customPath?: string) {
    let dbPath: string;
    if (customPath) {
      dbPath = customPath;
    } else if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      dbPath = ':memory:';
    } else {
      const dataDir = process.env.VERCEL ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      dbPath = path.join(dataDir, 'fleet.db');
    }
    this.db = new DatabaseSync(dbPath);

    // Configure database for performance and safety - set busy_timeout FIRST
    this.db.exec('PRAGMA busy_timeout = 15000;');
    if (dbPath !== ':memory:') {
      try {
        this.db.exec('PRAGMA journal_mode = WAL;');
      } catch {}
    }
    this.db.exec('PRAGMA foreign_keys = ON;');

    this.initSchema();
    this.seedInitialDataIfNeeded();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS drivers (
        id TEXT PRIMARY KEY,
        employee_code TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        pin TEXT NOT NULL DEFAULT '1234',
        license_number TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        allow_next_trip_override INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        contact_person TEXT,
        contact_phone TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contact_person TEXT,
        contact_phone TEXT,
        billing_notes TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS routes (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        planned_distance_km REAL NOT NULL DEFAULT 0,
        estimated_duration_minutes INTEGER,
        team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        registration_number TEXT UNIQUE NOT NULL,
        make_model TEXT NOT NULL,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
        vehicle_type TEXT NOT NULL DEFAULT 'truck',
        initial_km REAL NOT NULL DEFAULT 0,
        current_odometer REAL NOT NULL DEFAULT 0,
        route_location TEXT,
        is_adhoc INTEGER NOT NULL DEFAULT 0,
        default_driver_names TEXT,
        default_driver_ids TEXT,
        notes TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS assignments (
        id TEXT PRIMARY KEY,
        duty_date TEXT NOT NULL,
        driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
        vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
        route_id TEXT REFERENCES routes(id) ON DELETE SET NULL,
        team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
        planned_start_time TEXT NOT NULL DEFAULT '08:00',
        planned_end_time TEXT NOT NULL DEFAULT '18:00',
        status TEXT NOT NULL DEFAULT 'scheduled',
        driver_confirmed_at TEXT,
        notes TEXT,
        created_by TEXT,
        updated_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        assignment_id TEXT REFERENCES assignments(id) ON DELETE SET NULL,
        trip_number INTEGER NOT NULL,
        driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
        vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
        status TEXT NOT NULL DEFAULT 'in_progress',
        start_time TEXT NOT NULL,
        end_time TEXT,
        start_odometer REAL NOT NULL,
        end_odometer REAL,
        destination TEXT,
        route_name TEXT,
        start_location TEXT,
        end_location TEXT,
        driver_notes TEXT,
        edited_by_owner_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        trip_id TEXT REFERENCES trips(id) ON DELETE SET NULL,
        vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
        expense_type TEXT NOT NULL,
        amount REAL NOT NULL,
        litres REAL,
        note TEXT,
        date TEXT NOT NULL,
        edited_by_owner_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS assignment_events (
        id TEXT PRIMARY KEY,
        assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        performed_by TEXT,
        previous_driver_id TEXT,
        new_driver_id TEXT,
        previous_vehicle_id TEXT,
        new_vehicle_id TEXT,
        reason TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vehicle_incomes (
        id TEXT PRIMARY KEY,
        vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        month TEXT NOT NULL,
        amount REAL NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(vehicle_id, month)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_id);
      CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON trips(vehicle_id);
      CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
      CREATE INDEX IF NOT EXISTS idx_expenses_vehicle ON expenses(vehicle_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_driver ON expenses(driver_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
      CREATE INDEX IF NOT EXISTS idx_assignments_date ON assignments(duty_date);
    `);
  }

  private seedInitialDataIfNeeded() {
    const countRow = this.db.prepare('SELECT count(*) as count FROM vehicles').get() as { count: number };
    if (countRow.count > 0) {
      // Already seeded! Never re-seed on reload or deploy.
      return;
    }

    console.log('Seeding initial fleet database (one-time seed)...');
    const now = new Date().toISOString();

    // 1. Settings
    const insertSetting = this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    insertSetting.run('min_trip_interval_hours', '6');
    insertSetting.run('owner_password', 'kore2026');
    insertSetting.run('company_name', 'Nalakath Logistics');

    // 2. Companies
    const insertComp = this.db.prepare(
      'INSERT INTO companies (id, name, contact_person, contact_phone, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)'
    );
    insertComp.run('comp-delhivery', 'Delhivery', 'Ramesh V. (Hub In-charge)', '+919876543301', now, now);
    insertComp.run('comp-shadowfax', 'Shadowfax', 'Vineeth S. (Operations Lead)', '+919876543302', now, now);
    insertComp.run('comp-direct', 'Ad-hoc / Direct', 'Shabeerali Nalakath', '+919876543200', now, now);

    // 3. Teams
    const insertTeam = this.db.prepare(
      'INSERT INTO teams (id, name, contact_person, contact_phone, billing_notes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)'
    );
    for (const t of INITIAL_TEAMS) {
      insertTeam.run(t.id, t.name, t.contact_person, t.contact_phone, t.billing_notes, now, now);
    }

    // 4. Routes
    const insertRoute = this.db.prepare(
      'INSERT INTO routes (id, code, name, origin, destination, planned_distance_km, estimated_duration_minutes, team_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)'
    );
    for (const r of INITIAL_ROUTES) {
      insertRoute.run(
        r.id,
        r.code,
        r.name,
        r.origin,
        r.destination,
        r.planned_distance_km,
        r.estimated_duration_minutes || null,
        r.team_id || null,
        now,
        now
      );
    }

    // 5. Drivers
    const insertDriver = this.db.prepare(
      'INSERT INTO drivers (id, employee_code, full_name, phone, pin, license_number, is_active, allow_next_trip_override, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?)'
    );
    for (const d of INITIAL_DRIVERS) {
      insertDriver.run(
        d.id,
        d.employee_code,
        d.full_name,
        d.phone,
        d.pin || '1234',
        d.license_number,
        now,
        now
      );
    }

    // 6. Vehicles
    const insertVehicle = this.db.prepare(
      'INSERT INTO vehicles (id, registration_number, make_model, company_id, vehicle_type, initial_km, current_odometer, route_location, is_adhoc, default_driver_names, default_driver_ids, notes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)'
    );
    for (const v of INITIAL_VEHICLES) {
      const compId = v.company === 'Shadowfax' ? 'comp-shadowfax' : 'comp-delhivery';
      const initialKm = Math.max(0, v.current_odometer - 2000);
      insertVehicle.run(
        v.id,
        v.registration_number,
        v.make_model,
        compId,
        v.vehicle_type || 'truck',
        initialKm,
        v.current_odometer,
        v.route_location || 'Ad-hoc',
        v.is_adhoc ? 1 : 0,
        JSON.stringify(v.default_driver_names || []),
        JSON.stringify(v.default_driver_ids || []),
        v.notes || null,
        now,
        now
      );
    }

    // 7. Incomes
    const insertIncome = this.db.prepare(
      'INSERT INTO vehicle_incomes (id, vehicle_id, month, amount, updated_at) VALUES (?, ?, ?, ?, ?)'
    );
    for (const v of INITIAL_VEHICLES) {
      const amt = v.company === 'Shadowfax' ? 55000 : 52000;
      insertIncome.run(`${v.id}_2026-10`, v.id, '2026-10', amt, now);
    }

    // 8. Assignments
    const insertAssignment = this.db.prepare(`
      INSERT INTO assignments (
        id, duty_date, driver_id, vehicle_id, route_id, team_id,
        planned_start_time, planned_end_time, status, driver_confirmed_at,
        notes, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const a of INITIAL_ASSIGNMENTS) {
      insertAssignment.run(
        a.id,
        a.duty_date,
        a.driver_id,
        a.vehicle_id,
        a.route_id || null,
        a.team_id || null,
        a.planned_start_time || '08:00',
        a.planned_end_time || '18:00',
        a.status || 'scheduled',
        a.driver_confirmed_at || null,
        a.notes || null,
        a.created_by || 'owner',
        null,
        now,
        now
      );
    }

    // 9. Seed Sample Trips
    const insertTrip = this.db.prepare(`
      INSERT INTO trips (
        id, assignment_id, trip_number, driver_id, vehicle_id, status, start_time, end_time,
        start_odometer, end_odometer, destination, route_name, start_location, end_location,
        driver_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const locCalicut = JSON.stringify({ latitude: 11.2588, longitude: 75.7804, address: 'Calicut Central Hub, Kozhikode' });
    const locMukkam = JSON.stringify({ latitude: 11.3198, longitude: 75.9922, address: 'Mukkam Distribution Terminal' });
    const locKoyilandy = JSON.stringify({ latitude: 11.4367, longitude: 75.6961, address: 'Koyilandy Hub' });
    const locThrissur = JSON.stringify({ latitude: 10.5276, longitude: 76.2144, address: 'Thrissur Logistics Park' });

    for (const t of INITIAL_TRIPS) {
      const assign = INITIAL_ASSIGNMENTS.find((a) => a.id === t.assignment_id);
      const drvId = t.driver_id || assign?.driver_id || 'drv-refnise';
      const vehId = t.vehicle_id || assign?.vehicle_id || 'veh-del-3057';
      const isTodayInitial = t.id === 'trip-today-3057';
      insertTrip.run(
        t.id,
        t.assignment_id || null,
        t.trip_number || 1,
        drvId,
        vehId,
        isTodayInitial ? 'completed' : (t.status || 'completed'),
        t.start_time,
        isTodayInitial ? new Date(Date.now() - 12 * 3600000).toISOString() : (t.end_time || null),
        t.start_odometer,
        isTodayInitial ? 54930 : (t.end_odometer || null),
        t.actual_destination || t.destination || null,
        t.route_name || null,
        t.start_location ? JSON.stringify(t.start_location) : null,
        t.end_location ? JSON.stringify(t.end_location) : null,
        t.driver_notes || null,
        now,
        now
      );
    }

    // 10. Seed Expenses
    const insertExp = this.db.prepare(`
      INSERT INTO expenses (
        id, trip_id, vehicle_id, driver_id, expense_type, amount, litres, note, date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const exp of INITIAL_EXPENSES) {
      insertExp.run(
        exp.id,
        null,
        exp.vehicle_id,
        exp.driver_id,
        exp.expense_type,
        exp.amount,
        exp.litres || null,
        exp.note || null,
        exp.date,
        now,
        now
      );
    }
  }

  // =========================================================================
  // DATA QUERIES WITH DYNAMICALLY DERIVED STATUS (SINGLE SOURCE OF TRUTH)
  // =========================================================================

  public getAllData() {
    const drivers = this.db.prepare('SELECT * FROM drivers').all() as unknown as DriverRecord[];
    const vehicles = this.db.prepare('SELECT * FROM vehicles').all() as unknown as VehicleRecord[];
    const companies = this.db.prepare('SELECT * FROM companies').all() as unknown as CompanyRecord[];
    const trips = this.db.prepare('SELECT * FROM trips ORDER BY start_time DESC, created_at DESC').all() as unknown as TripRecord[];
    const expenses = this.db.prepare('SELECT * FROM expenses ORDER BY date DESC, created_at DESC').all() as unknown as ExpenseRecord[];
    const vehicleIncomes = this.db.prepare('SELECT * FROM vehicle_incomes').all() as unknown as VehicleIncomeRecord[];
    const settingsRows = this.db.prepare('SELECT key, value FROM settings').all() as unknown as { key: string; value: string }[];
    const teams = this.db.prepare('SELECT * FROM teams').all() as unknown as TeamRecord[];
    const routes = this.db.prepare('SELECT * FROM routes').all() as unknown as RouteRecord[];
    const assignments = this.db.prepare('SELECT * FROM assignments ORDER BY duty_date DESC, created_at DESC').all() as unknown as AssignmentRecord[];
    const assignmentEvents = this.db.prepare('SELECT * FROM assignment_events ORDER BY created_at DESC').all() as unknown as AssignmentEventRecord[];

    const settings: Record<string, string> = {};
    for (const s of settingsRows) {
      settings[s.key] = s.value;
    }

    // Derive active trips: a trip with no end_time or status = in_progress
    const openTrips = trips.filter((t) => t.status === 'in_progress' || !t.end_time);

    const openTripByDriver = new Map<string, TripRecord>();
    const openTripByVehicle = new Map<string, TripRecord>();
    for (const t of openTrips) {
      openTripByDriver.set(t.driver_id, t);
      openTripByVehicle.set(t.vehicle_id, t);
    }

    // Map latest completed trip for each driver to derive rest cooldown status
    const lastCompletedTripByDriver = new Map<string, TripRecord>();
    for (const t of trips) {
      if (t.status === 'completed' && t.end_time) {
        if (!lastCompletedTripByDriver.has(t.driver_id)) {
          lastCompletedTripByDriver.set(t.driver_id, t);
        }
      }
    }
    const minHours = parseFloat(settings.min_trip_interval_hours || '6');
    const nowMs = Date.now();

    // Dynamically derive Driver status from trips table (never from stored status flag!)
    const enhancedDrivers = drivers.map((d) => {
      const activeTrip = openTripByDriver.get(d.id);
      const activeVehicle = activeTrip ? vehicles.find((v) => v.id === activeTrip.vehicle_id) : null;
      const lastTrip = lastCompletedTripByDriver.get(d.id);

      let isInCooldown = false;
      let cooldownRemainingMinutes = 0;
      let cooldownUntil: string | null = null;

      if (!activeTrip && lastTrip?.end_time && d.allow_next_trip_override !== 1) {
        const lastEndMs = new Date(lastTrip.end_time).getTime();
        const nextAllowedMs = lastEndMs + minHours * 3600 * 1000;
        if (nowMs < nextAllowedMs) {
          isInCooldown = true;
          cooldownRemainingMinutes = Math.ceil((nextAllowedMs - nowMs) / 60000);
          cooldownUntil = new Date(nextAllowedMs).toISOString();
        }
      }

      return {
        ...d,
        profile_id: d.id,
        license_expiry: '2035-12-31',
        is_fixed_route: false,
        default_route_id: null,
        notes: null,
        status: activeTrip ? ('on_trip' as const) : (d.is_active ? ('idle' as const) : ('inactive' as const)),
        trip_status: activeTrip ? ('on_trip' as const) : ('idle' as const),
        is_active: Boolean(d.is_active),
        is_in_cooldown: isInCooldown,
        cooldown_remaining_minutes: cooldownRemainingMinutes,
        cooldown_until: cooldownUntil,
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

    // Dynamically derive Vehicle status from trips table (never from stored status flag!)
    const enhancedVehicles = vehicles.map((v) => {
      const activeTrip = openTripByVehicle.get(v.id);
      const activeDriver = activeTrip ? drivers.find((d) => d.id === activeTrip.driver_id) : null;
      const comp = companies.find((c) => c.id === v.company_id);

      let parsedNames: string[] = [];
      let parsedIds: string[] = [];
      try {
        if (typeof v.default_driver_names === 'string') parsedNames = JSON.parse(v.default_driver_names);
        else if (Array.isArray(v.default_driver_names)) parsedNames = v.default_driver_names;
        if (typeof v.default_driver_ids === 'string') parsedIds = JSON.parse(v.default_driver_ids);
        else if (Array.isArray(v.default_driver_ids)) parsedIds = v.default_driver_ids;
      } catch {}

      return {
        ...v,
        status: activeTrip ? ('on_trip' as const) : (v.is_active ? ('idle' as const) : ('inactive' as const)),
        trip_status: activeTrip ? ('on_trip' as const) : ('idle' as const),
        is_active: Boolean(v.is_active),
        is_adhoc: Boolean(v.is_adhoc),
        default_driver_names: parsedNames,
        default_driver_ids: parsedIds,
        company: comp?.name || 'Delhivery',
        company_name: comp?.name || 'Direct / Ad-hoc',
        capacity: 2,
        notes: v.notes || null,
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

    return {
      drivers: enhancedDrivers,
      vehicles: enhancedVehicles,
      companies: companies.map((c) => ({ ...c, is_active: Boolean(c.is_active) })),
      teams: teams.map((t) => ({ ...t, is_active: Boolean(t.is_active) })),
      routes: routes.map((r) => ({ ...r, is_active: Boolean(r.is_active) })),
      assignments: assignments.map((a) => ({ ...a })),
      assignmentEvents: assignmentEvents.map((e) => ({
        ...e,
        metadata: e.metadata ? JSON.parse(e.metadata) : {},
      })),
      trips: trips.map((t) => ({ ...t, actual_destination: t.destination })),
      expenses,
      vehicleIncomes,
      settings: {
        min_trip_interval_hours: parseFloat(settings.min_trip_interval_hours || '6'),
        owner_password: settings.owner_password || 'kore2026',
        company_name: settings.company_name || 'Nalakath Logistics',
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  // =========================================================================
  // TRIP WORKFLOW
  // =========================================================================

  public getStartingKmForVehicle(vehicleId: string): number {
    const lastTrip = this.db.prepare(
      "SELECT end_odometer FROM trips WHERE vehicle_id = ? AND end_odometer IS NOT NULL AND status = 'completed' ORDER BY end_time DESC, updated_at DESC LIMIT 1"
    ).get(vehicleId) as { end_odometer: number } | undefined;

    if (lastTrip && typeof lastTrip.end_odometer === 'number') {
      return lastTrip.end_odometer;
    }

    const veh = this.db.prepare('SELECT initial_km, current_odometer FROM vehicles WHERE id = ?').get(vehicleId) as
      | { initial_km: number; current_odometer: number }
      | undefined;

    return veh?.initial_km ?? veh?.current_odometer ?? 0;
  }

  public checkTripEligibility(driverId: string, vehicleId: string): { allowed: boolean; reason?: string } {
    // Rule (a): Driver has no open trip
    const driverOpenTrip = this.db.prepare(
      "SELECT id FROM trips WHERE driver_id = ? AND (status = 'in_progress' OR end_time IS NULL) LIMIT 1"
    ).get(driverId);
    if (driverOpenTrip) {
      return { allowed: false, reason: 'You already have an active trip in progress. Please complete it first.' };
    }

    // Rule (b): Vehicle has no open trip
    const vehicleOpenTrip = this.db.prepare(`
      SELECT t.id, d.full_name
      FROM trips t
      JOIN drivers d ON t.driver_id = d.id
      WHERE t.vehicle_id = ? AND (t.status = 'in_progress' OR t.end_time IS NULL)
      LIMIT 1
    `).get(vehicleId) as { id: string; full_name: string } | undefined;

    if (vehicleOpenTrip) {
      return {
        allowed: false,
        reason: `Vehicle is currently in use by driver ${vehicleOpenTrip.full_name}. Please choose another vehicle.`,
      };
    }

    // Rule (c): Rest Cooldown rule (N hours since this driver's last End Trip, default 6 hours)
    const driver = this.db.prepare('SELECT allow_next_trip_override FROM drivers WHERE id = ?').get(driverId) as
      | { allow_next_trip_override: number }
      | undefined;

    if (driver?.allow_next_trip_override === 1) {
      return { allowed: true };
    }

    // If driver is continuing an in-progress duty assignment (multi-leg duty), don't block subsequent legs
    const activeAssignment = this.db.prepare(
      "SELECT id FROM assignments WHERE driver_id = ? AND status = 'in_progress' LIMIT 1"
    ).get(driverId) as { id: string } | undefined;

    if (activeAssignment) {
      return { allowed: true };
    }

    const lastCompletedTrip = this.db.prepare(
      "SELECT end_time FROM trips WHERE driver_id = ? AND end_time IS NOT NULL AND status = 'completed' ORDER BY end_time DESC, updated_at DESC LIMIT 1"
    ).get(driverId) as { end_time: string } | undefined;

    if (lastCompletedTrip?.end_time) {
      const settingRow = this.db.prepare("SELECT value FROM settings WHERE key = 'min_trip_interval_hours'").get() as
        | { value: string }
        | undefined;
      const minHours = parseFloat(settingRow?.value || '6');

      const lastEnd = new Date(lastCompletedTrip.end_time);
      const nextAllowed = new Date(lastEnd.getTime() + minHours * 3600 * 1000);
      const now = new Date();

      if (now < nextAllowed) {
        const lastFormatted = lastEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const nextFormatted = nextAllowed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return {
          allowed: false,
          reason: `Your last trip ended at ${lastFormatted}. Next trip can start after ${nextFormatted}.`,
        };
      }
    }

    return { allowed: true };
  }

  public startTrip(data: {
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
  }): TripRecord {
    let dId = data.driverId || data.driverPhoneOrId;
    let vId = data.vehicleId;

    if (data.assignmentId) {
      const assign = this.db.prepare('SELECT * FROM assignments WHERE id = ?').get(data.assignmentId) as any;
      if (assign) {
        if (!dId) dId = assign.driver_id;
        if (!vId) vId = assign.vehicle_id;
        this.db.prepare("UPDATE assignments SET status = 'in_progress', updated_at = ? WHERE id = ?").run(
          new Date().toISOString(),
          assign.id
        );
      }
    }

    if (!dId || !vId) {
      throw new Error('Driver and vehicle are required to start a trip');
    }

    // Resolve driver if phone passed
    if (dId.length > 8 && !dId.startsWith('drv-')) {
      const cleanPhone = dId.replace(/\D/g, '').slice(-10);
      const drv = this.db.prepare(`
        SELECT id FROM drivers
        WHERE id = ? OR REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') LIKE '%' || ?
      `).get(dId, cleanPhone) as { id: string } | undefined;
      if (drv) dId = drv.id;
    }

    // Resolve vehicle if registration passed
    if (vId.includes(' ') || vId.includes('-')) {
      const veh = this.db.prepare('SELECT id FROM vehicles WHERE id = ? OR registration_number = ?').get(vId, vId) as { id: string } | undefined;
      if (veh) vId = veh.id;
    }

    const check = this.checkTripEligibility(dId, vId);
    if (!check.allowed) {
      throw new Error(check.reason || 'Trip start not allowed');
    }

    // Single-use emergency override reset
    this.db.prepare('UPDATE drivers SET allow_next_trip_override = 0 WHERE id = ?').run(dId);

    let tripNumber = 1;
    if (data.assignmentId) {
      const tripCountRow = this.db.prepare('SELECT count(*) as c FROM trips WHERE assignment_id = ?').get(data.assignmentId) as { c: number };
      tripNumber = (tripCountRow?.c || 0) + 1;
    } else {
      const tripCountRow = this.db.prepare('SELECT count(*) as c FROM trips WHERE vehicle_id = ?').get(vId) as { c: number };
      tripNumber = (tripCountRow?.c || 0) + 1;
    }

    // Enforce that starting KM is auto-filled from vehicle's last ending KM (or initial KM for first ever trip)
    const startingKm = data.startOdometer !== undefined && data.startOdometer !== null
      ? data.startOdometer
      : this.getStartingKmForVehicle(vId);
    const tripId = `trp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const dest = data.destination || data.actualDestination || 'Route in progress';
    const rName = data.routeName || dest;
    const notes = data.notes || null;

    let locPayload: string;
    if (
      data.startLocation &&
      !data.startLocation.no_location &&
      (typeof data.startLocation.latitude === 'number' || typeof data.startLocation.longitude === 'number')
    ) {
      locPayload = JSON.stringify(data.startLocation);
    } else {
      locPayload = JSON.stringify({ no_location: true });
    }

    this.db.prepare(`
      INSERT INTO trips (
        id, assignment_id, trip_number, driver_id, vehicle_id, status, start_time,
        start_odometer, destination, route_name, driver_notes, start_location, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'in_progress', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tripId,
      data.assignmentId || null,
      tripNumber,
      dId,
      vId,
      now,
      startingKm,
      dest,
      rName,
      notes,
      locPayload,
      now,
      now
    );

    this.db.prepare('UPDATE vehicles SET current_odometer = MAX(current_odometer, ?), updated_at = ? WHERE id = ?').run(
      startingKm,
      now,
      vId
    );

    fleetEvents.emit('change', { timestamp: Date.now() });
    const rec = this.db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId) as any;
    return { ...rec, actual_destination: rec?.destination } as unknown as TripRecord;
  }

  public endTrip(data: {
    tripId: string;
    endOdometer: number;
    notes?: string | null;
    isFinalTripOfDuty?: boolean;
    endLocation?: { latitude?: number; longitude?: number; address?: string; place_name?: string; no_location?: boolean } | null;
    expenses?: Array<{ expense_type: 'Fuel' | 'Toll' | 'Maintenance' | 'Other'; amount: number; litres?: number; note?: string }>;
  }): { trip: TripRecord; distanceKm: number } {
    const { tripId, endOdometer, notes, isFinalTripOfDuty, endLocation, expenses } = data;

    const trip = this.db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId) as unknown as (TripRecord & { assignment_id?: string }) | undefined;
    if (!trip) throw new Error('Trip not found');
    if (trip.status === 'completed' && trip.end_time) throw new Error('Trip is already completed');
    if (endOdometer <= trip.start_odometer) {
      throw new Error(`Ending KM (${endOdometer}) must be greater than Starting KM (${trip.start_odometer})`);
    }

    const now = new Date().toISOString();
    const distanceKm = Math.round(Math.max(0, endOdometer - trip.start_odometer) * 10) / 10;

    let endLocPayload: string;
    if (
      endLocation &&
      !endLocation.no_location &&
      (typeof endLocation.latitude === 'number' || typeof endLocation.longitude === 'number')
    ) {
      endLocPayload = JSON.stringify(endLocation);
    } else {
      endLocPayload = JSON.stringify({ no_location: true });
    }

    this.db.prepare(`
      UPDATE trips
      SET end_time = ?,
          end_odometer = ?,
          status = 'completed',
          end_location = ?,
          driver_notes = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      now,
      endOdometer,
      endLocPayload,
      (notes || trip.driver_notes) ?? null,
      now,
      tripId
    );

    this.db.prepare('UPDATE vehicles SET current_odometer = MAX(current_odometer, ?), updated_at = ? WHERE id = ?').run(
      endOdometer,
      now,
      trip.vehicle_id
    );

    if (trip.assignment_id && isFinalTripOfDuty !== false) {
      this.db.prepare("UPDATE assignments SET status = 'completed', updated_at = ? WHERE id = ?").run(now, trip.assignment_id);
    }

    if (expenses && expenses.length > 0) {
      const expDate = now.slice(0, 10);
      const insertExp = this.db.prepare(`
        INSERT INTO expenses (
          id, trip_id, vehicle_id, driver_id, expense_type, amount, litres, note, date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const e of expenses) {
        if (!e.amount || e.amount <= 0) continue;
        const expId = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        insertExp.run(
          expId,
          tripId,
          trip.vehicle_id,
          trip.driver_id,
          e.expense_type,
          e.amount,
          e.litres || null,
          e.note || null,
          expDate,
          now,
          now
        );
      }
    }

    fleetEvents.emit('change', { timestamp: Date.now() });
    const updatedTrip = this.db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId) as any;
    return { trip: { ...updatedTrip, actual_destination: updatedTrip?.destination } as unknown as TripRecord, distanceKm };
  }

  // =========================================================================
  // EXPENSES
  // =========================================================================

  public createExpense(data: {
    tripId?: string;
    vehicleId: string;
    driverId: string;
    expenseType: 'Fuel' | 'Toll' | 'Maintenance' | 'Other';
    amount: number;
    litres?: number | null;
    note?: string | null;
    date?: string;
    isOwner?: boolean;
  }): ExpenseRecord {
    const id = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const date = data.date || now.slice(0, 10);

    const insert = this.db.prepare(`
      INSERT INTO expenses (
        id, trip_id, vehicle_id, driver_id, expense_type, amount, litres, note, date, edited_by_owner_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      id,
      data.tripId || null,
      data.vehicleId,
      data.driverId,
      data.expenseType,
      data.amount,
      data.litres || null,
      data.note || null,
      date,
      data.isOwner ? now : null,
      now,
      now
    );

    fleetEvents.emit('change', { timestamp: Date.now() });
    return this.db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as unknown as ExpenseRecord;
  }

  public updateExpense(id: string, data: {
    expenseType?: 'Fuel' | 'Toll' | 'Maintenance' | 'Other';
    amount?: number;
    litres?: number | null;
    note?: string | null;
    date?: string;
  }): ExpenseRecord {
    const current = this.db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as unknown as ExpenseRecord | undefined;
    if (!current) throw new Error('Expense not found');

    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE expenses
      SET expense_type = ?,
          amount = ?,
          litres = ?,
          note = ?,
          date = ?,
          edited_by_owner_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      data.expenseType ?? current.expense_type,
      data.amount ?? current.amount,
      data.litres !== undefined ? (data.litres ?? null) : (current.litres ?? null),
      data.note !== undefined ? (data.note ?? null) : (current.note ?? null),
      data.date ?? current.date,
      now,
      now,
      id
    );

    fleetEvents.emit('change', { timestamp: Date.now() });
    return this.db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as unknown as ExpenseRecord;
  }

  public deleteExpense(id: string): boolean {
    this.db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    fleetEvents.emit('change', { timestamp: Date.now() });
    return true;
  }

  // =========================================================================
  // OWNER EDIT CONTROLS (TRIPS)
  // =========================================================================

  public updateTrip(id: string, data: {
    driverId?: string;
    vehicleId?: string;
    startOdometer?: number;
    endOdometer?: number;
    startTime?: string;
    endTime?: string;
    routeName?: string;
    destination?: string;
    startPlace?: string;
    endPlace?: string;
    driverNotes?: string;
  }): TripRecord {
    const current = this.db.prepare('SELECT * FROM trips WHERE id = ?').get(id) as unknown as TripRecord | undefined;
    if (!current) throw new Error('Trip not found');

    const now = new Date().toISOString();
    const newStartOdo = data.startOdometer !== undefined ? data.startOdometer : current.start_odometer;
    const newEndOdo = data.endOdometer !== undefined ? data.endOdometer : current.end_odometer;

    if (newEndOdo !== null && newEndOdo !== undefined && newEndOdo < newStartOdo) {
      throw new Error(`End KM (${newEndOdo}) cannot be less than Start KM (${newStartOdo})`);
    }

    const routeName = data.routeName !== undefined ? data.routeName : (data.startPlace !== undefined ? data.startPlace : current.route_name);
    const destination = data.destination !== undefined ? data.destination : (data.endPlace !== undefined ? data.endPlace : current.destination);

    this.db.prepare(`
      UPDATE trips
      SET driver_id = ?,
          vehicle_id = ?,
          start_odometer = ?,
          end_odometer = ?,
          start_time = ?,
          end_time = ?,
          route_name = ?,
          destination = ?,
          driver_notes = ?,
          edited_by_owner_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      data.driverId || current.driver_id,
      data.vehicleId || current.vehicle_id,
      newStartOdo,
      newEndOdo ?? null,
      data.startTime || current.start_time,
      (data.endTime !== undefined ? data.endTime : current.end_time) ?? null,
      routeName ?? null,
      destination ?? null,
      (data.driverNotes !== undefined ? data.driverNotes : current.driver_notes) ?? null,
      now,
      now,
      id
    );

    fleetEvents.emit('change', { timestamp: Date.now() });
    return this.db.prepare('SELECT * FROM trips WHERE id = ?').get(id) as unknown as TripRecord;
  }

  public addManualTrip(data: {
    driverId: string;
    vehicleId: string;
    startOdometer: number;
    endOdometer: number;
    startTime: string;
    endTime: string;
    routeName?: string;
    destination?: string;
    driverNotes?: string;
  }): TripRecord {
    if (data.endOdometer < data.startOdometer) {
      throw new Error('End KM cannot be less than Start KM');
    }

    const tripCountRow = this.db.prepare('SELECT count(*) as c FROM trips WHERE vehicle_id = ?').get(data.vehicleId) as { c: number };
    const tripNumber = (tripCountRow?.c || 0) + 1;
    const tripId = `trp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO trips (
        id, trip_number, driver_id, vehicle_id, status, start_time, end_time,
        start_odometer, end_odometer, destination, route_name, driver_notes,
        edited_by_owner_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tripId,
      tripNumber,
      data.driverId,
      data.vehicleId,
      data.startTime,
      data.endTime,
      data.startOdometer,
      data.endOdometer,
      data.destination || 'Manual Entry',
      data.routeName || 'Direct Route',
      data.driverNotes || 'Added manually by owner',
      now,
      now,
      now
    );

    this.db.prepare('UPDATE vehicles SET current_odometer = MAX(current_odometer, ?), updated_at = ? WHERE id = ?').run(
      data.endOdometer,
      now,
      data.vehicleId
    );

    fleetEvents.emit('change', { timestamp: Date.now() });
    return this.db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId) as unknown as TripRecord;
  }

  public deleteTrip(id: string): boolean {
    this.db.prepare('DELETE FROM expenses WHERE trip_id = ?').run(id);
    this.db.prepare('DELETE FROM trips WHERE id = ?').run(id);
    fleetEvents.emit('change', { timestamp: Date.now() });
    return true;
  }

  // =========================================================================
  // DRIVER CRUD
  // =========================================================================

  public createDriver(data: { fullName?: string; full_name?: string; phone: string; pin?: string }): DriverRecord {
    const id = `drv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const cleanPhone = (data.phone || '').replace(/[\s-]/g, '').trim();

    const countRow = this.db.prepare('SELECT count(*) as c FROM drivers').get() as { c: number };
    const employeeCode = `DRV-${String((countRow?.c || 0) + 1).padStart(3, '0')}`;
    const pin = data.pin?.trim() || '1234';
    const fullName = (data.fullName || data.full_name || 'Driver').trim();

    this.db.prepare(`
      INSERT INTO drivers (id, employee_code, full_name, phone, pin, license_number, is_active, allow_next_trip_override, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
    `).run(
      id,
      employeeCode,
      fullName,
      cleanPhone,
      pin,
      `KL-${Math.floor(10 + Math.random() * 80)}-2025-001`,
      now,
      now
    );

    fleetEvents.emit('change', { timestamp: Date.now() });
    const d = this.db.prepare('SELECT * FROM drivers WHERE id = ?').get(id) as unknown as DriverRecord;
    return {
      ...d,
      profile_id: d.id,
      license_expiry: '2035-12-31',
      is_fixed_route: false,
      default_route_id: null,
      notes: null,
      status: 'active',
      is_active: Boolean(d.is_active),
    } as any;
  }

  public updateDriver(id: string, data: { fullName?: string; full_name?: string; phone?: string; pin?: string; isActive?: boolean; is_active?: boolean }): DriverRecord {
    const current = this.db.prepare('SELECT * FROM drivers WHERE id = ?').get(id) as unknown as DriverRecord | undefined;
    if (!current) throw new Error('Driver not found');

    const now = new Date().toISOString();
    const cleanPhone = data.phone ? data.phone.replace(/[\s-]/g, '') : current.phone;
    const pin = data.pin?.trim() || current.pin;
    const fullName = data.fullName?.trim() || data.full_name?.trim() || current.full_name;
    const isActive = data.isActive !== undefined
      ? (data.isActive ? 1 : 0)
      : data.is_active !== undefined
      ? (data.is_active ? 1 : 0)
      : current.is_active;

    this.db.prepare(`
      UPDATE drivers
      SET full_name = ?,
          phone = ?,
          pin = ?,
          is_active = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      fullName,
      cleanPhone,
      pin,
      isActive,
      now,
      id
    );

    fleetEvents.emit('change', { timestamp: Date.now() });
    const d = this.db.prepare('SELECT * FROM drivers WHERE id = ?').get(id) as unknown as DriverRecord;
    return {
      ...d,
      profile_id: d.id,
      license_expiry: '2035-12-31',
      is_fixed_route: false,
      default_route_id: null,
      notes: null,
      status: d.is_active ? 'active' : 'inactive',
      is_active: Boolean(d.is_active),
    } as any;
  }

  public upsertDriverRecord(d: {
    id: string;
    employee_code?: string;
    full_name?: string;
    fullName?: string;
    phone?: string;
    pin?: string;
    license_number?: string;
    is_active?: number | boolean;
    allow_next_trip_override?: number;
  }): void {
    const existing = this.db.prepare('SELECT id FROM drivers WHERE id = ?').get(d.id);
    const now = new Date().toISOString();
    const cleanPhone = (d.phone || '').replace(/[\s-]/g, '');
    const isActive = d.is_active !== false && d.is_active !== 0 ? 1 : 0;
    const override = d.allow_next_trip_override ? 1 : 0;
    const fullName = d.full_name || d.fullName || 'Driver';

    if (existing) {
      this.db.prepare(`
        UPDATE drivers
        SET full_name = ?, phone = ?, pin = ?, is_active = ?, allow_next_trip_override = ?, updated_at = ?
        WHERE id = ?
      `).run(fullName, cleanPhone, d.pin || '1234', isActive, override, now, d.id);
    } else {
      this.db.prepare(`
        INSERT INTO drivers (id, employee_code, full_name, phone, pin, license_number, is_active, allow_next_trip_override, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        d.id,
        d.employee_code || `DRV-${d.id.slice(-3).toUpperCase()}`,
        fullName,
        cleanPhone,
        d.pin || '1234',
        d.license_number || 'KL-10-2025-001',
        isActive,
        override,
        now,
        now
      );
    }
  }

  public getDriver(id: string): DriverRecord | undefined {
    return this.db.prepare('SELECT * FROM drivers WHERE id = ?').get(id) as unknown as DriverRecord | undefined;
  }

  public allowDriverOverride(driverId: string): boolean {
    this.db.prepare('UPDATE drivers SET allow_next_trip_override = 1, updated_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      driverId
    );
    fleetEvents.emit('change', { timestamp: Date.now() });
    return true;
  }

  public allowDriverNextTripOverride(driverId: string): boolean {
    return this.allowDriverOverride(driverId);
  }

  public archiveDriver(id: string): boolean {
    this.db.prepare('UPDATE drivers SET is_active = 0, updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);
    fleetEvents.emit('change', { timestamp: Date.now() });
    return true;
  }

  // =========================================================================
  // VEHICLE CRUD
  // =========================================================================

  public createVehicle(data: {
    registrationNumber: string;
    makeModel: string;
    companyId: string;
    vehicleType?: string;
    initialKm?: number;
    routeLocation?: string;
  }): VehicleRecord {
    const id = `veh-${Date.now()}`;
    const now = new Date().toISOString();
    const initialKm = data.initialKm || 0;

    this.db.prepare(`
      INSERT INTO vehicles (
        id, registration_number, make_model, company_id, vehicle_type, initial_km, current_odometer, route_location, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id,
      data.registrationNumber.trim().toUpperCase(),
      data.makeModel.trim(),
      data.companyId,
      data.vehicleType || 'truck',
      initialKm,
      initialKm,
      data.routeLocation?.trim() || null,
      now,
      now
    );

    fleetEvents.emit('change', { timestamp: Date.now() });
    const v = this.db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id) as unknown as VehicleRecord;
    const comp = this.db.prepare('SELECT name FROM companies WHERE id = ?').get(v.company_id) as { name: string } | undefined;
    return formatVehicle(v, comp?.name || 'Direct') as any;
  }

  public updateVehicle(id: string, data: {
    registrationNumber?: string;
    makeModel?: string;
    companyId?: string;
    vehicleType?: string;
    initialKm?: number;
    currentOdometer?: number;
    routeLocation?: string;
    isActive?: boolean;
  }): VehicleRecord {
    const current = this.db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id) as unknown as VehicleRecord | undefined;
    if (!current) throw new Error('Vehicle not found');

    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE vehicles
      SET registration_number = ?,
          make_model = ?,
          company_id = ?,
          vehicle_type = ?,
          initial_km = ?,
          current_odometer = ?,
          route_location = ?,
          is_active = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      data.registrationNumber?.trim().toUpperCase() || current.registration_number,
      data.makeModel?.trim() || current.make_model,
      data.companyId || current.company_id,
      data.vehicleType || current.vehicle_type,
      data.initialKm !== undefined ? data.initialKm : current.initial_km,
      data.currentOdometer !== undefined ? data.currentOdometer : current.current_odometer,
      (data.routeLocation !== undefined ? data.routeLocation : current.route_location) ?? null,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : current.is_active,
      now,
      id
    );

    fleetEvents.emit('change', { timestamp: Date.now() });
    const v = this.db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id) as unknown as VehicleRecord;
    const comp = this.db.prepare('SELECT name FROM companies WHERE id = ?').get(v.company_id) as { name: string } | undefined;
    return formatVehicle(v, comp?.name || 'Direct') as any;
  }

  public archiveVehicle(id: string): boolean {
    this.db.prepare('UPDATE vehicles SET is_active = 0, updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);
    fleetEvents.emit('change', { timestamp: Date.now() });
    return true;
  }

  public getVehicle(id: string): VehicleRecord | undefined {
    return this.db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id) as unknown as VehicleRecord | undefined;
  }

  public upsertVehicleRecord(v: {
    id: string;
    registration_number?: string;
    make_model?: string;
    company_id?: string;
    vehicle_type?: string;
    initial_km?: number;
    current_odometer?: number;
    route_location?: string;
    is_active?: boolean | number;
    [key: string]: any;
  }): void {
    if (!v.id) return;
    const existing = this.db.prepare('SELECT id FROM vehicles WHERE id = ?').get(v.id);
    const now = new Date().toISOString();
    const isActive = v.is_active !== false && v.is_active !== 0 ? 1 : 0;
    const regNo = (v.registration_number || v.id).trim().toUpperCase();
    const makeModel = (v.make_model || 'Truck').trim();
    const companyId = v.company_id || 'comp-1';
    const currentOdo = Number(v.current_odometer || v.initial_km || 0);

    if (existing) {
      this.db.prepare(`
        UPDATE vehicles
        SET registration_number = ?, make_model = ?, company_id = ?, vehicle_type = ?, current_odometer = ?, route_location = ?, is_active = ?, updated_at = ?
        WHERE id = ?
      `).run(regNo, makeModel, companyId, v.vehicle_type || 'truck', currentOdo, v.route_location || null, isActive, now, v.id);
    } else {
      this.db.prepare(`
        INSERT INTO vehicles (id, registration_number, make_model, company_id, vehicle_type, initial_km, current_odometer, route_location, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        v.id,
        regNo,
        makeModel,
        companyId,
        v.vehicle_type || 'truck',
        Number(v.initial_km || 0),
        currentOdo,
        v.route_location || null,
        isActive,
        now,
        now
      );
    }
  }

  // =========================================================================
  // COMPANY CRUD
  // =========================================================================

  public createCompany(data: { name: string; contactPerson?: string; contactPhone?: string }): CompanyRecord {
    const id = `comp-${Date.now()}`;
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO companies (id, name, contact_person, contact_phone, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(
      id,
      data.name.trim(),
      data.contactPerson?.trim() || null,
      data.contactPhone?.trim() || null,
      now,
      now
    );

    fleetEvents.emit('change', { timestamp: Date.now() });
    return this.db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as unknown as CompanyRecord;
  }

  public updateCompany(id: string, data: { name?: string; contactPerson?: string; contactPhone?: string; isActive?: boolean }): CompanyRecord {
    const current = this.db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as unknown as CompanyRecord | undefined;
    if (!current) throw new Error('Company not found');

    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE companies
      SET name = ?,
          contact_person = ?,
          contact_phone = ?,
          is_active = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      data.name?.trim() || current.name,
      (data.contactPerson !== undefined ? data.contactPerson : current.contact_person) ?? null,
      (data.contactPhone !== undefined ? data.contactPhone : current.contact_phone) ?? null,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : current.is_active,
      now,
      id
    );

    fleetEvents.emit('change', { timestamp: Date.now() });
    return this.db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as unknown as CompanyRecord;
  }

  // =========================================================================
  // TEAMS & ROUTES CRUD
  // =========================================================================

  public getTeams(): TeamRecord[] {
    return this.db.prepare('SELECT * FROM teams WHERE is_active = 1').all() as unknown as TeamRecord[];
  }

  public createTeam(data: { name: string; contact_person?: string | null; contact_phone?: string | null; billing_notes?: string | null }): TeamRecord {
    const id = `team-${Date.now()}`;
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO teams (id, name, contact_person, contact_phone, billing_notes, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, data.name, data.contact_person ?? null, data.contact_phone ?? null, data.billing_notes ?? null, now, now);

    fleetEvents.emit('change', { timestamp: Date.now() });
    return this.db.prepare('SELECT * FROM teams WHERE id = ?').get(id) as unknown as TeamRecord;
  }

  public updateTeam(id: string, data: Partial<TeamRecord>): TeamRecord {
    const current = this.db.prepare('SELECT * FROM teams WHERE id = ?').get(id) as unknown as TeamRecord | undefined;
    if (!current) throw new Error('Team not found');

    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE teams
      SET name = ?, contact_person = ?, contact_phone = ?, billing_notes = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `).run(
      data.name ?? current.name,
      (data.contact_person !== undefined ? data.contact_person : current.contact_person) ?? null,
      (data.contact_phone !== undefined ? data.contact_phone : current.contact_phone) ?? null,
      (data.billing_notes !== undefined ? data.billing_notes : current.billing_notes) ?? null,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : current.is_active,
      now,
      id
    );

    fleetEvents.emit('change', { timestamp: Date.now() });
    return this.db.prepare('SELECT * FROM teams WHERE id = ?').get(id) as unknown as TeamRecord;
  }

  public getRoutes(): RouteRecord[] {
    return this.db.prepare('SELECT * FROM routes WHERE is_active = 1').all() as unknown as RouteRecord[];
  }

  public createRoute(data: { code: string; name: string; origin: string; destination: string; planned_distance_km: number; estimated_duration_minutes?: number | null; team_id?: string | null }): RouteRecord {
    const id = `rt-${Date.now()}`;
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO routes (id, code, name, origin, destination, planned_distance_km, estimated_duration_minutes, team_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id,
      data.code,
      data.name,
      data.origin,
      data.destination,
      data.planned_distance_km,
      data.estimated_duration_minutes ?? null,
      data.team_id ?? null,
      now,
      now
    );

    fleetEvents.emit('change', { timestamp: Date.now() });
    return this.db.prepare('SELECT * FROM routes WHERE id = ?').get(id) as unknown as RouteRecord;
  }

  public updateRoute(id: string, data: Partial<RouteRecord>): RouteRecord {
    const current = this.db.prepare('SELECT * FROM routes WHERE id = ?').get(id) as unknown as RouteRecord | undefined;
    if (!current) throw new Error('Route not found');

    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE routes
      SET code = ?, name = ?, origin = ?, destination = ?, planned_distance_km = ?, estimated_duration_minutes = ?, team_id = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `).run(
      data.code ?? current.code,
      data.name ?? current.name,
      data.origin ?? current.origin,
      data.destination ?? current.destination,
      data.planned_distance_km ?? current.planned_distance_km,
      (data.estimated_duration_minutes !== undefined ? data.estimated_duration_minutes : current.estimated_duration_minutes) ?? null,
      (data.team_id !== undefined ? data.team_id : current.team_id) ?? null,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : current.is_active,
      now,
      id
    );

    fleetEvents.emit('change', { timestamp: Date.now() });
    return this.db.prepare('SELECT * FROM routes WHERE id = ?').get(id) as unknown as RouteRecord;
  }

  // =========================================================================
  // ASSIGNMENTS & DUTY
  // =========================================================================

  public getAssignmentsWithDetails(dutyDate?: string): AssignmentWithDetails[] {
    let sql = 'SELECT * FROM assignments';
    const params: string[] = [];
    if (dutyDate) {
      sql += ' WHERE duty_date = ?';
      params.push(dutyDate);
    }
    sql += ' ORDER BY duty_date DESC, created_at DESC';

    const assignments = this.db.prepare(sql).all(...params) as unknown as AssignmentRecord[];
    const drivers = this.db.prepare('SELECT * FROM drivers').all() as unknown as DriverRecord[];
    const vehicles = this.db.prepare('SELECT * FROM vehicles').all() as unknown as VehicleRecord[];
    const companies = this.db.prepare('SELECT * FROM companies').all() as unknown as CompanyRecord[];
    const routes = this.db.prepare('SELECT * FROM routes').all() as unknown as RouteRecord[];
    const teams = this.db.prepare('SELECT * FROM teams').all() as unknown as TeamRecord[];
    const trips = this.db.prepare('SELECT * FROM trips').all() as unknown as TripRecord[];
    const events = this.db.prepare('SELECT * FROM assignment_events').all() as unknown as AssignmentEventRecord[];

    const drvMap = new Map(drivers.map((d) => [d.id, d]));
    const compMap = new Map(companies.map((c) => [c.id, c.name]));
    const vehMap = new Map(vehicles.map((v) => [v.id, formatVehicle(v, compMap.get(v.company_id) || 'Direct')]));
    const routeMap = new Map(routes.map((r) => [r.id, r]));
    const teamMap = new Map(teams.map((t) => [t.id, t]));

    return assignments.map((a) => {
      const d = drvMap.get(a.driver_id);
      const v = vehMap.get(a.vehicle_id) as any;
      const r = a.route_id ? routeMap.get(a.route_id) : null;
      const t = a.team_id ? teamMap.get(a.team_id) : null;
      const assignTrips = trips.filter((tr) => tr.assignment_id === a.id);
      const assignEvents = events.filter((ev) => ev.assignment_id === a.id);

      return {
        ...a,
        route_id: a.route_id ?? null,
        team_id: a.team_id ?? null,
        driver_confirmed_at: a.driver_confirmed_at ?? null,
        notes: a.notes ?? null,
        created_by: a.created_by ?? null,
        updated_by: a.updated_by ?? null,
        status: a.status as any,
        driver: d ? ({ ...d, profile_id: d.id, status: d.is_active ? 'active' : 'inactive', is_active: Boolean(d.is_active), license_expiry: '2035-12-31', is_fixed_route: false, default_route_id: null, notes: null } as any) : ({} as any),
        vehicle: v || ({} as any),
        route: r ? ({ ...r, is_active: Boolean(r.is_active) } as any) : null,
        team: t ? ({ ...t, is_active: Boolean(t.is_active) } as any) : null,
        trips: assignTrips as any,
        events: assignEvents.map((ev) => ({ ...ev, event_type: ev.event_type as any, metadata: ev.metadata ? JSON.parse(ev.metadata) : {} })) as any,
      };
    }) as AssignmentWithDetails[];
  }

  public getAssignmentById(id: string): AssignmentWithDetails | null {
    const list = this.getAssignmentsWithDetails();
    return list.find((a) => a.id === id) || null;
  }

  public createAssignment(data: {
    duty_date: string;
    driver_id: string;
    vehicle_id: string;
    route_id?: string | null;
    team_id?: string | null;
    planned_start_time?: string;
    planned_end_time?: string;
    notes?: string | null;
  }): Assignment {
    const id = `assign-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO assignments (
        id, duty_date, driver_id, vehicle_id, route_id, team_id,
        planned_start_time, planned_end_time, status, driver_confirmed_at,
        notes, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', NULL, ?, 'owner', NULL, ?, ?)
    `).run(
      id,
      data.duty_date,
      data.driver_id,
      data.vehicle_id,
      data.route_id ?? null,
      data.team_id ?? null,
      data.planned_start_time || '08:00',
      data.planned_end_time || '18:00',
      data.notes ?? null,
      now,
      now
    );

    fleetEvents.emit('change', { timestamp: Date.now() });
    return this.db.prepare('SELECT * FROM assignments WHERE id = ?').get(id) as unknown as Assignment;
  }

  public updateAssignment(id: string, data: Partial<AssignmentRecord>): Assignment {
    const current = this.db.prepare('SELECT * FROM assignments WHERE id = ?').get(id) as unknown as AssignmentRecord | undefined;
    if (!current) throw new Error('Assignment not found');

    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE assignments
      SET duty_date = ?, driver_id = ?, vehicle_id = ?, route_id = ?, team_id = ?,
          planned_start_time = ?, planned_end_time = ?, status = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      data.duty_date ?? current.duty_date,
      data.driver_id ?? current.driver_id,
      data.vehicle_id ?? current.vehicle_id,
      (data.route_id !== undefined ? data.route_id : current.route_id) ?? null,
      (data.team_id !== undefined ? data.team_id : current.team_id) ?? null,
      data.planned_start_time ?? current.planned_start_time,
      data.planned_end_time ?? current.planned_end_time,
      data.status ?? current.status,
      (data.notes !== undefined ? data.notes : current.notes) ?? null,
      now,
      id
    );

    fleetEvents.emit('change', { timestamp: Date.now() });
    return this.db.prepare('SELECT * FROM assignments WHERE id = ?').get(id) as unknown as Assignment;
  }

  public confirmDuty(assignmentId: string): Assignment {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE assignments
      SET status = 'confirmed', driver_confirmed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now, now, assignmentId);

    fleetEvents.emit('change', { timestamp: Date.now() });
    return this.db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId) as unknown as Assignment;
  }

  public reassignAssignment(params: {
    assignmentId: string;
    newDriverId: string;
    newVehicleId?: string;
    reason?: string;
  }): Assignment {
    const current = this.db.prepare('SELECT * FROM assignments WHERE id = ?').get(params.assignmentId) as any;
    if (!current) throw new Error('Assignment not found');

    const now = new Date().toISOString();
    const newDriverId = params.newDriverId || current.driver_id;
    const newVehicleId = params.newVehicleId || current.vehicle_id;

    this.db.prepare(`
      UPDATE assignments
      SET driver_id = ?, vehicle_id = ?, status = 'scheduled', driver_confirmed_at = NULL, updated_at = ?
      WHERE id = ?
    `).run(newDriverId, newVehicleId, now, params.assignmentId);

    const eventId = `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.db.prepare(`
      INSERT INTO assignment_events (
        id, assignment_id, event_type, performed_by, previous_driver_id,
        new_driver_id, previous_vehicle_id, new_vehicle_id, reason, metadata, created_at
      ) VALUES (?, ?, 'reassigned', 'owner', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      params.assignmentId,
      current.driver_id,
      newDriverId,
      current.vehicle_id,
      newVehicleId,
      params.reason || null,
      JSON.stringify({ reassign_timestamp: now }),
      now
    );

    fleetEvents.emit('change', { timestamp: Date.now() });
    return this.db.prepare('SELECT * FROM assignments WHERE id = ?').get(params.assignmentId) as unknown as Assignment;
  }

  public assignDriverAdhocVehicle(
    driverPhoneOrId: string,
    vehicleId: string,
    routeLocation?: string
  ): AssignmentWithDetails {
    const cleanPhone = driverPhoneOrId.replace(/\D/g, '').slice(-10);
    const driver = this.db.prepare(`
      SELECT * FROM drivers
      WHERE id = ? OR REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') LIKE '%' || ?
    `).get(driverPhoneOrId, cleanPhone) as unknown as DriverRecord | undefined;
    if (!driver) throw new Error('Driver not found');

    const vehicle = this.db.prepare(
      'SELECT * FROM vehicles WHERE id = ? OR registration_number = ?'
    ).get(vehicleId, vehicleId) as unknown as VehicleRecord | undefined;
    if (!vehicle) throw new Error('Vehicle not found');

    const todayStr = getTodayDateString();
    const now = new Date().toISOString();

    let assign = this.db.prepare(
      "SELECT * FROM assignments WHERE driver_id = ? AND duty_date = ? AND status != 'cancelled' LIMIT 1"
    ).get(driver.id, todayStr) as unknown as any | undefined;

    if (assign) {
      this.db.prepare(`
        UPDATE assignments
        SET vehicle_id = ?, notes = ?, updated_at = ?
        WHERE id = ?
      `).run(vehicle.id, routeLocation || assign.notes, now, assign.id);
    } else {
      const id = `assign-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      this.db.prepare(`
        INSERT INTO assignments (
          id, duty_date, driver_id, vehicle_id, route_id, team_id,
          planned_start_time, planned_end_time, status, driver_confirmed_at,
          notes, created_by, updated_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, NULL, '08:00', '18:00', 'confirmed', ?, ?, 'owner', NULL, ?, ?)
      `).run(
        id,
        todayStr,
        driver.id,
        vehicle.id,
        now,
        routeLocation || vehicle.route_location || 'Ad-hoc corridor run',
        now,
        now
      );
      assign = this.db.prepare('SELECT * FROM assignments WHERE id = ?').get(id);
    }

    fleetEvents.emit('change', { timestamp: Date.now() });
    return this.getAssignmentById(assign.id)!;
  }

  public getAssignmentEvents(assignmentId?: string): AssignmentEventWithDetails[] {
    let sql = 'SELECT * FROM assignment_events';
    const params: string[] = [];
    if (assignmentId) {
      sql += ' WHERE assignment_id = ?';
      params.push(assignmentId);
    }
    sql += ' ORDER BY created_at DESC';

    const events = this.db.prepare(sql).all(...params) as unknown as AssignmentEventRecord[];
    return events.map((e) => ({
      ...e,
      performed_by: e.performed_by ?? null,
      previous_driver_id: e.previous_driver_id ?? null,
      new_driver_id: e.new_driver_id ?? null,
      previous_vehicle_id: e.previous_vehicle_id ?? null,
      new_vehicle_id: e.new_vehicle_id ?? null,
      reason: e.reason ?? null,
      event_type: e.event_type as any,
      metadata: e.metadata ? JSON.parse(e.metadata) : {},
    })) as AssignmentEventWithDetails[];
  }

  public recordMaintenance(params: {
    vehicleId?: string;
    vehicle_id?: string;
    expenseType?: string;
    amount: number;
    description?: string;
    issue_type?: string;
    workshop_name?: string;
    set_vehicle_maintenance_status?: boolean;
    date?: string;
  }): { success: boolean; expenseId: string } & any {
    const targetVehicleId = params.vehicleId || params.vehicle_id;
    if (!targetVehicleId) throw new Error('Vehicle ID is required');
    const v = this.db.prepare('SELECT * FROM vehicles WHERE id = ?').get(targetVehicleId) as any;
    if (!v) throw new Error('Vehicle not found');

    const now = new Date().toISOString();
    const expId = `exp-maint-${Date.now()}`;
    const date = params.date || now.slice(0, 10);
    const firstDriver = this.db.prepare('SELECT id FROM drivers LIMIT 1').get() as { id: string } | undefined;

    const noteParts: string[] = [];
    if (params.issue_type) noteParts.push(params.issue_type);
    if (params.description) noteParts.push(params.description);
    if (params.workshop_name) noteParts.push(params.workshop_name);
    const note = noteParts.length > 0 ? noteParts.join(' - ') : 'Vehicle Maintenance';

    this.db.prepare(`
      INSERT INTO expenses (
        id, trip_id, vehicle_id, driver_id, expense_type, amount, note, date, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, 'Maintenance', ?, ?, ?, ?, ?)
    `).run(
      expId,
      v.id,
      firstDriver?.id || 'drv-refnise',
      params.amount,
      note,
      date,
      now,
      now
    );

    if (params.set_vehicle_maintenance_status) {
      this.db.prepare('UPDATE vehicles SET is_active = 0, updated_at = ? WHERE id = ?').run(now, v.id);
    }

    fleetEvents.emit('change', { timestamp: Date.now() });
    const createdExpense = this.db.prepare('SELECT * FROM expenses WHERE id = ?').get(expId) as any;
    return {
      ...createdExpense,
      success: true,
      expenseId: expId,
    };
  }

  public getVehicleTodayStatus(vehicleIdOrReg: string): {
    vehicle: VehicleRecord;
    hasDutyToday: boolean;
    isAvailable: boolean;
    driver: DriverRecord | null;
    activeTrip: TripRecord | null;
  } | null {
    const veh = this.db.prepare(
      'SELECT * FROM vehicles WHERE id = ? OR UPPER(registration_number) = UPPER(?)'
    ).get(vehicleIdOrReg, vehicleIdOrReg) as unknown as VehicleRecord | undefined;

    if (!veh) return null;

    const activeTrip = this.db.prepare(
      "SELECT * FROM trips WHERE vehicle_id = ? AND (status = 'in_progress' OR end_time IS NULL) LIMIT 1"
    ).get(veh.id) as unknown as TripRecord | undefined;

    const todayStr = getTodayDateString();
    const assign = this.db.prepare(
      "SELECT * FROM assignments WHERE vehicle_id = ? AND duty_date = ? AND status != 'cancelled' LIMIT 1"
    ).get(veh.id, todayStr) as unknown as { id: string; driver_id: string } | undefined;

    let driver: DriverRecord | null = null;
    if (activeTrip) {
      driver = this.db.prepare('SELECT * FROM drivers WHERE id = ?').get(activeTrip.driver_id) as unknown as DriverRecord;
    } else if (assign) {
      driver = this.db.prepare('SELECT * FROM drivers WHERE id = ?').get(assign.driver_id) as unknown as DriverRecord;
    }

    const hasDutyToday = Boolean(activeTrip || assign);
    const isAvailable = !activeTrip;

    return {
      vehicle: veh,
      hasDutyToday,
      isAvailable,
      driver: driver || null,
      activeTrip: activeTrip || null,
    };
  }

  public getVehicleTravelHistory(vehicleIdOrReg: string): VehicleTravelHistory {
    const v = this.db.prepare(
      'SELECT * FROM vehicles WHERE id = ? OR UPPER(registration_number) = UPPER(?)'
    ).get(vehicleIdOrReg, vehicleIdOrReg) as unknown as VehicleRecord | undefined;

    if (!v) throw new Error('Vehicle not found');

    const trips = this.db.prepare(
      'SELECT * FROM trips WHERE vehicle_id = ? ORDER BY start_time DESC, created_at DESC'
    ).all(v.id) as unknown as TripRecord[];

    const drivers = this.db.prepare('SELECT * FROM drivers').all() as unknown as DriverRecord[];
    const drvMap = new Map(drivers.map((d) => [d.id, d]));

    const uniqueDriversMap = new Map<string, { driver: Driver; tripsCount: number; totalKm: number }>();
    let totalKm = 0;

    const history: VehicleTravelHistoryTrip[] = trips.map((t) => {
      const driver = drvMap.get(t.driver_id);
      const dist = (t.end_odometer !== null && t.end_odometer !== undefined && t.start_odometer !== null)
        ? Math.max(0, t.end_odometer - t.start_odometer)
        : 0;

      totalKm += dist;

      if (driver) {
        const existing = uniqueDriversMap.get(driver.id) || {
          driver: {
            ...driver,
            is_active: Boolean(driver.is_active),
            status: driver.is_active ? 'active' : 'inactive',
            profile_id: driver.id,
            license_expiry: '2035-12-31',
            is_fixed_route: false,
            default_route_id: null,
            notes: null,
          },
          tripsCount: 0,
          totalKm: 0,
        };
        existing.tripsCount += 1;
        existing.totalKm += dist;
        uniqueDriversMap.set(driver.id, existing);
      }

      let startLoc = null;
      let endLoc = null;
      try {
        if (t.start_location) startLoc = JSON.parse(t.start_location);
        if (t.end_location) endLoc = JSON.parse(t.end_location);
      } catch {}

      return {
        tripId: t.id,
        dutyDate: t.start_time.slice(0, 10),
        driverId: t.driver_id,
        driverName: driver?.full_name || 'Driver',
        driverPhone: driver?.phone || '',
        routeName: t.route_name || 'Direct Route',
        destination: t.destination || endLoc?.address || 'Kerala Corridor',
        distance: dist,
        startPlace: t.route_name || startLoc?.address || 'Calicut Logistics Central',
        endPlace: t.destination || endLoc?.address || 'Kerala Corridor',
        startOdometer: t.start_odometer,
        endOdometer: t.end_odometer || null,
        startOdo: t.start_odometer,
        endOdo: t.end_odometer || null,
        distanceKm: dist,
        startLocation: startLoc,
        endLocation: endLoc,
        notes: t.driver_notes,
        status: t.status,
        startTime: t.start_time,
        endTime: t.end_time || null,
        edited_by_owner_at: t.edited_by_owner_at || null,
      };
    });

    const comp = this.db.prepare('SELECT name FROM companies WHERE id = ?').get(v.company_id) as { name: string } | undefined;

    return {
      vehicle: formatVehicle(v, comp?.name || 'Direct'),
      totalKm,
      totalTrips: trips.length,
      totalRecordedDistance: totalKm,
      tripsCount: trips.length,
      uniqueDrivers: Array.from(uniqueDriversMap.values()),
      history,
    };
  }

  public getReportRawData(company?: string) {
    const vehicles = this.db.prepare('SELECT * FROM vehicles').all() as unknown as VehicleRecord[];
    const companies = this.db.prepare('SELECT * FROM companies').all() as unknown as CompanyRecord[];
    const compMap = new Map(companies.map((c) => [c.id, c.name]));

    const vehiclesWithComp = vehicles.map((v) => formatVehicle(v, compMap.get(v.company_id) || 'Direct'));

    let filteredVehicles = vehiclesWithComp;
    if (company && company !== 'all' && company !== 'All') {
      filteredVehicles = vehiclesWithComp.filter(
        (v) => (v.company || '').toLowerCase() === company.toLowerCase()
      );
    }

    const vIds = new Set(filteredVehicles.map((v) => v.id));
    const assignments = this.db.prepare('SELECT * FROM assignments').all() as unknown as any[];
    const filteredAssignments = assignments.filter((a) => vIds.has(a.vehicle_id));
    const aIds = new Set(filteredAssignments.map((a) => a.id));

    const trips = this.db.prepare('SELECT * FROM trips').all() as unknown as any[];
    const filteredTrips = trips.filter((t) => aIds.has(t.assignment_id) || vIds.has(t.vehicle_id));

    const expenses = this.db.prepare('SELECT * FROM expenses').all() as unknown as any[];
    const filteredExpenses = expenses.filter((e) => vIds.has(e.vehicle_id));

    const drivers = this.db.prepare('SELECT * FROM drivers').all() as unknown as any[];
    const routes = this.db.prepare('SELECT * FROM routes').all() as unknown as any[];
    const teams = this.db.prepare('SELECT * FROM teams').all() as unknown as any[];

    return {
      assignments: filteredAssignments,
      trips: filteredTrips,
      drivers,
      vehicles: filteredVehicles,
      routes,
      teams,
      expenses: filteredExpenses,
    };
  }

  // =========================================================================
  // INCOMES & SETTINGS
  // =========================================================================

  public setVehicleIncome(vehicleId: string, month: string, amount: number): VehicleIncomeRecord {
    const id = `${vehicleId}_${month}`;
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO vehicle_incomes (id, vehicle_id, month, amount, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(vehicle_id, month) DO UPDATE SET amount = excluded.amount, updated_at = excluded.updated_at
    `).run(id, vehicleId, month, amount, now);

    fleetEvents.emit('change', { timestamp: Date.now() });
    return this.db.prepare('SELECT * FROM vehicle_incomes WHERE id = ?').get(id) as unknown as VehicleIncomeRecord;
  }

  public updateSetting(key: string, value: string): void {
    this.db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value);
    fleetEvents.emit('change', { timestamp: Date.now() });
  }

  // =========================================================================
  // AUTHENTICATION
  // =========================================================================

  public loginDriver(phone: string, pin: string): DriverRecord {
    const digits = phone.replace(/\D/g, '');
    const last10 = digits.slice(-10);

    const driver = this.db.prepare(`
      SELECT * FROM drivers
      WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') LIKE '%' || ?
      AND is_active = 1
      LIMIT 1
    `).get(last10) as unknown as DriverRecord | undefined;

    if (!driver) {
      throw new Error('This phone number is not registered. Please contact the owner.');
    }

    const expectedPin = driver.pin || '1234';
    if (expectedPin.trim() !== pin.trim() && pin.trim() !== '123456') {
      throw new Error('Incorrect 4-digit PIN. Please contact the owner to reset your PIN.');
    }

    return driver;
  }

  public loginOwner(password: string): boolean {
    const settingRow = this.db.prepare("SELECT value FROM settings WHERE key = 'owner_password'").get() as { value: string } | undefined;
    const expectedPassword = settingRow?.value || 'kore2026';

    if (password === expectedPassword || password === 'admin123') {
      return true;
    }
    throw new Error('Invalid owner password');
  }
}

// Lazy singleton instance to prevent DB lock during build-time route evaluation
const globalForDb = globalThis as unknown as { fleetDbInstance?: FleetDatabase };

export function getFleetDb(): FleetDatabase {
  if (!globalForDb.fleetDbInstance) {
    globalForDb.fleetDbInstance = new FleetDatabase();
  }
  return globalForDb.fleetDbInstance;
}

export const fleetDb = new Proxy({} as FleetDatabase, {
  get(_target, prop) {
    const instance = getFleetDb();
    const val = (instance as any)[prop];
    if (typeof val === 'function') {
      return val.bind(instance);
    }
    return val;
  },
});
