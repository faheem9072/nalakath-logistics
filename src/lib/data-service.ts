import {
  Profile,
  Vehicle,
  VehicleStatus,
  Driver,
  DriverStatus,
  Team,
  Route,
  Assignment,
  Trip,
  Expense,
  ExpenseType,
  TripLocation,
  AssignmentEvent,
} from '@/types/database';
import {
  AssignmentWithDetails,
  TripWithDetails,
  DashboardMetrics,
  ExpenseWithDetails,
  VehicleDetailReport,
  VehicleMonthlyDriverStats,
  VehicleTravelHistoryTrip,
  VehicleTravelHistory,
  AssignmentEventWithDetails,
} from '@/types/models';
import { getTodayDateString, getCurrentMonthPrefix } from '@/lib/mock/mock-store';

export type { VehicleTravelHistory };

export interface Company {
  id: string;
  name: string;
  contact_person?: string | null;
  contact_phone?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DriverMonthlySummary {
  driver: Driver;
  month: string;
  totalKilometers: number;
  totalDaysWorked: number;
  totalTripsCount: number;
  vehiclesBreakdown: {
    vehicle: Vehicle;
    tripsCount: number;
    totalKm: number;
  }[];
  tripDetails: {
    tripId: string;
    dutyDate: string;
    vehicleRegistration: string;
    vehicleModel: string;
    destination: string;
    routeName: string;
    startOdo: number | null;
    endOdo: number | null;
    distance: number;
    notes?: string | null;
    status: string;
    startTime: string;
    endTime: string | null;
    startLocation?: TripLocation | null;
    endLocation?: TripLocation | null;
    editedByOwnerAt?: string | null;
  }[];
}

export interface CompanyMonthlyReport {
  company: Company;
  month: string;
  totalIncome: number;
  totalExpenses: number;
  profitOrLoss: number;
  vehiclesCount: number;
  activeTripsCount: number;
  vehicles: {
    vehicle: Vehicle;
    fuelExpense: number;
    tollExpense: number;
    maintenanceExpense: number;
    totalExpense: number;
    income: number;
    profitOrLoss: number;
    tripsCount: number;
    totalKm: number;
  }[];
}

export interface FleetState {
  drivers: (Driver & {
    current_vehicle?: { id: string; registration_number: string; make_model: string } | null;
    active_trip?: Trip | null;
    trip_status?: 'on_trip' | 'idle';
  })[];
  vehicles: (Vehicle & {
    company_name: string;
    current_driver?: { id: string; full_name: string; phone: string } | null;
    active_trip?: Trip | null;
    trip_status?: 'on_trip' | 'idle';
  })[];
  companies: Company[];
  teams: Team[];
  routes: Route[];
  assignments: Assignment[];
  assignmentEvents: AssignmentEventWithDetails[];
  trips: Trip[];
  expenses: Expense[];
  vehicleIncomes: { id: string; vehicle_id: string; month: string; amount: number; updated_at: string }[];
  settings: {
    min_trip_interval_hours: number;
    owner_password: string;
    company_name: string;
  };
  lastUpdated: string;
}

let directFsInstance: any = null;
async function getDirectFirestoreService() {
  if (typeof window === 'undefined') {
    if (!directFsInstance) {
      try {
        directFsInstance = await import('@/lib/firebase/firestore-service');
      } catch (err) {
        console.error('FIREBASE FIRESTORE SERVICE IMPORT ERROR:', err);
      }
    }
    return directFsInstance;
  }
  return null;
}

class ServerFleetRepository {
  private state: FleetState | null = null;
  private listeners: Set<() => void> = new Set();
  private isFetching = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private eventSource: EventSource | null = null;
  private sessionUserRole: 'owner' | 'driver' | null = null;
  private sessionDriverId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Restore login session with strict owner authentication check
      const savedRole = localStorage.getItem('fleet_session_role') as 'owner' | 'driver' | null;
      const savedDriverId = localStorage.getItem('fleet_session_driver_id');
      const isOwnerAuth = localStorage.getItem('fleet_owner_auth') === 'authenticated';

      if (savedRole === 'owner' && isOwnerAuth) {
        this.sessionUserRole = 'owner';
        this.sessionDriverId = null;
      } else if (savedRole === 'driver' && savedDriverId) {
        this.sessionUserRole = 'driver';
        this.sessionDriverId = savedDriverId;
      } else {
        this.sessionUserRole = null;
        this.sessionDriverId = null;
      }

      // Initial fetch and start live sync polling (10s interval fallback, pauses on hidden tab)
      this.refresh();
      this.initRealtimeStream();
      this.pollTimer = setInterval(() => this.refresh(), 10000);
    }
  }

  private initRealtimeStream() {
    if (typeof window === 'undefined') return;

    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      this.eventSource = new EventSource('/api/fleet/stream');
      this.eventSource.addEventListener('sync', () => {
        this.refresh();
      });
      this.eventSource.onerror = () => {
        // Will auto reconnect in standard EventSource; 10s polling acts as fallback
      };
    } catch (err) {
      console.warn('Realtime SSE stream setup error (will rely on polling):', err);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Listener callback error:', err);
      }
    });
  }

  public async refresh(): Promise<void> {
    if (typeof document !== 'undefined' && document.hidden) return;
    if (this.isFetching) return;
    this.isFetching = true;
    try {
      const fsService = await getDirectFirestoreService();
      if (fsService) {
        this.state = await fsService.fetchFleetStateFromFirestore();
        this.notify();
        return;
      }

      const res = await fetch('/api/fleet', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as FleetState;
        this.state = data;
        this.notify();
      }
    } catch (err) {
      console.warn('Fleet data sync poll failed (offline or server restarting):', err);
    } finally {
      this.isFetching = false;
    }
  }

  private async dispatchAction<T>(action: string, payload: any): Promise<T> {
    try {
      const fsService = await getDirectFirestoreService();
      if (fsService) {
        let result: any;
        switch (action) {
          case 'startTrip':
            result = { trip: await fsService.startTripInFirestore(payload) };
            break;
          case 'endTrip':
            result = await fsService.endTripInFirestore(payload);
            break;
          case 'updateTrip':
            result = { trip: await fsService.updateTripInFirestore(payload.id, payload.data) };
            break;
          case 'addManualTrip':
            result = { trip: await fsService.addManualTripInFirestore(payload) };
            break;
          case 'deleteTrip':
            result = await fsService.deleteTripInFirestore(payload.id);
            break;
          case 'createDriver':
            result = { driver: await fsService.createDriverInFirestore(payload) };
            break;
          case 'updateDriver':
            result = { driver: await fsService.updateDriverInFirestore(payload.id, payload.data) };
            break;
          case 'archiveDriver':
          case 'deleteDriver':
            result = await fsService.deleteDriverInFirestore(payload.id);
            break;
          case 'createVehicle':
            result = { vehicle: await fsService.createVehicleInFirestore(payload) };
            break;
          case 'updateVehicle':
            result = { vehicle: await fsService.updateVehicleInFirestore(payload.id, payload.data) };
            break;
          case 'archiveVehicle':
          case 'deleteVehicle':
            result = await fsService.deleteVehicleInFirestore(payload.id);
            break;
          case 'createExpense':
            result = { expense: await fsService.createExpenseInFirestore(payload) };
            break;
          case 'updateExpense':
            result = { expense: await fsService.updateExpenseInFirestore(payload.id, payload.data) };
            break;
          case 'deleteExpense':
            result = await fsService.deleteExpenseInFirestore(payload.id);
            break;
          case 'createCompany':
            result = { company: await fsService.createCompanyInFirestore(payload) };
            break;
          case 'updateCompany':
            result = { company: await fsService.updateCompanyInFirestore(payload.id, payload.data) };
            break;
          case 'deleteCompany':
            result = await fsService.deleteCompanyInFirestore(payload.id);
            break;
          case 'getLinkedCounts':
            result = await fsService.getLinkedCountsFromFirestore(payload.type, payload.id);
            break;
          case 'recordMaintenance':
            result = await fsService.recordMaintenanceInFirestore(payload);
            break;
          case 'setVehicleIncome':
            await fsService.saveVehicleIncomeInFirestore(payload.vehicleId, payload.month, payload.amount);
            result = { success: true };
            break;
          case 'updateSetting':
            await fsService.updateSettingInFirestore(payload.key, payload.value);
            result = { success: true };
            break;
          case 'allowDriverOverride':
            await fsService.allowDriverOverrideInFirestore(payload.driverId, payload.enabled !== false);
            result = { success: true };
            break;
          default:
            result = { success: true };
            break;
        }
        await this.refresh();
        return result as T;
      }

      const res = await fetch('/api/fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Action ${action} failed`);
      }

      // Non-blocking background sync so user UI never lags waiting for 7 collections
      this.refresh().catch(() => {});
      return data;
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Network error: Unable to save. Please check your connection.');
    }
  }

  public getLastUpdated(): string {
    return this.state?.lastUpdated ? new Date(this.state.lastUpdated).toLocaleTimeString() : 'Connecting...';
  }

  // =========================================================================
  // AUTH & SESSION
  // =========================================================================

  public async loginDriverByPhone(phone: string, pin: string = '1234'): Promise<Driver> {
    const fsService = await getDirectFirestoreService();
    if (fsService) {
      const driver = await fsService.loginDriverInFirestore(phone, pin);
      this.sessionUserRole = 'driver';
      this.sessionDriverId = driver.id;
      await this.refresh();
      return { ...driver, role: 'driver' as const };
    }

    const res = await fetch('/api/auth/driver-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, pin }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Driver login failed');
    }

    this.sessionUserRole = 'driver';
    this.sessionDriverId = data.driver.id;
    if (typeof window !== 'undefined') {
      localStorage.setItem('fleet_session_role', 'driver');
      localStorage.setItem('fleet_session_driver_id', data.driver.id);
      localStorage.removeItem('fleet_owner_auth');
    }
    await this.refresh();
    const drivers = await this.getDrivers();
    const d = drivers.find((drv) => drv.id === data.driver.id) || data.driver;
    return { ...d, role: 'driver' };
  }

  public async loginByPhone(phone: string, pin: string = '1234'): Promise<Driver> {
    return this.loginDriverByPhone(phone, pin);
  }

  public async loginDriverByNameAndPhone(name: string, phone: string): Promise<Driver> {
    const drivers = await this.getDrivers();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const matched = drivers.find((d) => {
      const dPhoneDigits = d.phone.replace(/\D/g, '').slice(-10);
      return dPhoneDigits === cleanPhone;
    });

    if (!matched) {
      throw new Error('This mobile number is not registered. Please contact the owner.');
    }
    return this.loginDriverByPhone(phone, matched.pin || '1234');
  }

  public async loginOwner(password: string): Promise<boolean> {
    const fsService = await getDirectFirestoreService();
    if (fsService) {
      const ok = await fsService.loginOwnerInFirestore(password);
      if (ok) {
        this.sessionUserRole = 'owner';
        this.sessionDriverId = null;
        if (typeof window !== 'undefined') {
          localStorage.setItem('fleet_session_role', 'owner');
          localStorage.setItem('fleet_owner_auth', 'authenticated');
          localStorage.removeItem('fleet_session_driver_id');
        }
      }
      return ok;
    }

    const res = await fetch('/api/auth/owner-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid owner password');
    }

    this.sessionUserRole = 'owner';
    this.sessionDriverId = null;
    if (typeof window !== 'undefined') {
      localStorage.setItem('fleet_session_role', 'owner');
      localStorage.setItem('fleet_owner_auth', 'authenticated');
      localStorage.removeItem('fleet_session_driver_id');
    }
    await this.refresh();
    return true;
  }

  public async logout(): Promise<void> {
    this.sessionUserRole = null;
    this.sessionDriverId = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fleet_session_role');
      localStorage.removeItem('fleet_session_driver_id');
      localStorage.removeItem('fleet_owner_auth');
    }
  }

  public async setSessionUser(userId: string): Promise<void> {
    if (userId.includes('0001') || userId === 'owner') {
      const isOwnerAuth = typeof window !== 'undefined' && localStorage.getItem('fleet_owner_auth') === 'authenticated';
      if (!isOwnerAuth) {
        throw new Error('Owner authorization required');
      }
      this.sessionUserRole = 'owner';
      this.sessionDriverId = null;
      if (typeof window !== 'undefined') {
        localStorage.setItem('fleet_session_role', 'owner');
        localStorage.removeItem('fleet_session_driver_id');
      }
    } else {
      const drivers = await this.getDrivers();
      const drv = drivers.find((d) => d.id === userId || d.profile_id === userId);
      if (drv) {
        this.sessionUserRole = 'driver';
        this.sessionDriverId = drv.id;
        if (typeof window !== 'undefined') {
          localStorage.setItem('fleet_session_role', 'driver');
          localStorage.setItem('fleet_session_driver_id', drv.id);
          localStorage.removeItem('fleet_owner_auth');
        }
      }
    }
  }

  public async getCurrentProfile(): Promise<Profile | null> {
    if (typeof window !== 'undefined') {
      const savedRole = localStorage.getItem('fleet_session_role');
      const savedDriverId = localStorage.getItem('fleet_session_driver_id');
      const isOwnerAuth = localStorage.getItem('fleet_owner_auth') === 'authenticated';

      if (savedRole === 'driver' && savedDriverId) {
        if (!this.state) await this.refresh();
        const drivers = this.state?.drivers || [];
        const drv = drivers.find((d) => d.id === savedDriverId);
        if (drv) {
          return {
            id: drv.id,
            phone: drv.phone,
            full_name: drv.full_name,
            role: 'driver',
            is_active: Boolean(drv.is_active),
            created_at: drv.created_at,
            updated_at: drv.updated_at,
          };
        }
      }

      if (savedRole === 'owner' && isOwnerAuth) {
        return {
          id: '00000000-0000-0000-0000-000000000001',
          phone: '+919876543200',
          full_name: 'Shabeerali Nalakath (Owner)',
          role: 'owner',
          is_active: true,
          created_at: '2026-10-01T00:00:00Z',
          updated_at: '2026-10-01T00:00:00Z',
        };
      }

      return null;
    }

    if (this.sessionUserRole === 'driver' && this.sessionDriverId) {
      if (!this.state) await this.refresh();
      const drivers = this.state?.drivers || [];
      const drv = drivers.find((d) => d.id === this.sessionDriverId);
      if (drv) {
        return {
          id: drv.id,
          phone: drv.phone,
          full_name: drv.full_name,
          role: 'driver',
          is_active: Boolean(drv.is_active),
          created_at: drv.created_at,
          updated_at: drv.updated_at,
        };
      }
    }

    if (this.sessionUserRole === 'owner') {
      return {
        id: '00000000-0000-0000-0000-000000000001',
        phone: '+919876543200',
        full_name: 'Shabeerali Nalakath (Owner)',
        role: 'owner',
        is_active: true,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
      };
    }

    return null;
  }

  // =========================================================================
  // READ DATA METHODS (ALWAYS SHARED SINGLE SOURCE OF TRUTH)
  // =========================================================================

  public async getDrivers(): Promise<FleetState['drivers']> {
    if (!this.state) await this.refresh();
    return this.state?.drivers || [];
  }

  public async getVehicles(company?: string): Promise<FleetState['vehicles']> {
    if (!this.state) await this.refresh();
    let list = this.state?.vehicles || [];
    if (company && company !== 'all' && company !== 'All') {
      list = list.filter((v) => (v.company || v.company_name || '').toLowerCase() === company.toLowerCase());
    }
    return list;
  }

  public async getCompanies(): Promise<Company[]> {
    if (!this.state) await this.refresh();
    return this.state?.companies || [];
  }

  public async getTeams(): Promise<Team[]> {
    if (!this.state) await this.refresh();
    return this.state?.teams || [];
  }

  public async getRoutes(): Promise<Route[]> {
    if (!this.state) await this.refresh();
    return this.state?.routes || [];
  }

  public async getTrips(): Promise<Trip[]> {
    if (!this.state) await this.refresh();
    return this.state?.trips || [];
  }

  public async getExpenses(filter?: {
    vehicleId?: string;
    driverId?: string;
    monthPrefix?: string;
  }): Promise<ExpenseWithDetails[]> {
    if (!this.state) await this.refresh();
    const vehiclesMap = new Map((this.state?.vehicles || []).map((v) => [v.id, v]));
    const driversMap = new Map((this.state?.drivers || []).map((d) => [d.id, d]));

    let list = this.state?.expenses || [];
    if (filter?.vehicleId) {
      list = list.filter((e) => e.vehicle_id === filter.vehicleId);
    }
    if (filter?.driverId) {
      list = list.filter((e) => e.driver_id === filter.driverId);
    }
    if (filter?.monthPrefix && filter.monthPrefix !== 'ALL') {
      list = list.filter((e) => e.date.startsWith(filter.monthPrefix!));
    }

    return list.map((e) => ({
      ...e,
      vehicle: vehiclesMap.get(e.vehicle_id) || null,
      driver: driversMap.get(e.driver_id) || null,
    }));
  }

  public async getDriverExpenses(
    driverPhoneOrId: string,
    monthPrefix?: string
  ): Promise<ExpenseWithDetails[]> {
    if (!this.state) await this.refresh();
    const cleanPhone = driverPhoneOrId.replace(/\D/g, '').slice(-10);
    const driver = (this.state?.drivers || []).find(
      (d) =>
        d.id === driverPhoneOrId ||
        d.phone.replace(/\D/g, '').slice(-10) === cleanPhone ||
        d.profile_id === driverPhoneOrId
    );
    if (!driver) return [];
    return this.getExpenses({ driverId: driver.id, monthPrefix });
  }

  public async getAssignmentsWithDetails(dutyDate?: string): Promise<AssignmentWithDetails[]> {
    if (!this.state) await this.refresh();
    const driversMap = new Map((this.state?.drivers || []).map((d) => [d.id, d]));
    const vehiclesMap = new Map((this.state?.vehicles || []).map((v) => [v.id, v]));
    const routesMap = new Map((this.state?.routes || []).map((r) => [r.id, r]));
    const teamsMap = new Map((this.state?.teams || []).map((t) => [t.id, t]));

    let list = this.state?.assignments || [];
    if (dutyDate) {
      list = list.filter((a) => a.duty_date === dutyDate);
    }

    return list.map((a) => {
      const driver = driversMap.get(a.driver_id) || ({} as Driver);
      const vehicle = vehiclesMap.get(a.vehicle_id) || ({} as Vehicle);
      const route = a.route_id ? routesMap.get(a.route_id) || null : null;
      const team = a.team_id ? teamsMap.get(a.team_id) || null : null;
      const trips = (this.state?.trips || []).filter((tr) => tr.assignment_id === a.id);
      const events = (this.state?.assignmentEvents || []).filter((ev) => ev.assignment_id === a.id);

      return {
        ...a,
        driver,
        vehicle,
        route,
        team,
        trips,
        events,
      };
    });
  }

  public async getAssignmentById(id: string): Promise<AssignmentWithDetails | null> {
    const list = await this.getAssignmentsWithDetails();
    return list.find((a) => a.id === id) || null;
  }

  public async getAssignmentEvents(assignmentId?: string): Promise<AssignmentEventWithDetails[]> {
    if (!this.state) await this.refresh();
    let events = this.state?.assignmentEvents || [];
    if (assignmentId) {
      events = events.filter((e) => e.assignment_id === assignmentId);
    }
    return events;
  }

  public async getTripsWithDetails(): Promise<TripWithDetails[]> {
    if (!this.state) await this.refresh();
    const assigns = await this.getAssignmentsWithDetails();
    const assignMap = new Map(assigns.map((a) => [a.id, a]));
    const routesMap = new Map((this.state?.routes || []).map((r) => [r.id, r]));
    const driversMap = new Map((this.state?.drivers || []).map((d) => [d.id, d]));
    const vehiclesMap = new Map((this.state?.vehicles || []).map((v) => [v.id, v]));

    return (this.state?.trips || []).map((t) => {
      const assign = t.assignment_id ? assignMap.get(t.assignment_id) : undefined;
      const driver = (t.driver_id ? driversMap.get(t.driver_id) : undefined) || assign?.driver || ({} as Driver);
      const vehicle = (t.vehicle_id ? vehiclesMap.get(t.vehicle_id) : undefined) || assign?.vehicle || ({} as Vehicle);

      return {
        ...t,
        assignment: (assign || {
          id: t.assignment_id || `assign-${t.id}`,
          duty_date: t.start_time ? t.start_time.slice(0, 10) : getTodayDateString(),
          driver_id: driver.id,
          vehicle_id: vehicle.id,
          route_id: null,
          team_id: null,
          planned_start_time: '08:00',
          planned_end_time: '18:00',
          status: 'completed',
          driver_confirmed_at: null,
          notes: null,
          created_by: null,
          updated_by: null,
          created_at: t.created_at,
          updated_at: t.updated_at,
          driver,
          vehicle,
        }) as any,
        assigned_route: t.assigned_route_id ? routesMap.get(t.assigned_route_id) || null : null,
      };
    });
  }

  public async getDriverAssignments(driverIdOrPhone: string): Promise<AssignmentWithDetails[]> {
    const list = await this.getAssignmentsWithDetails();
    const cleanPhone = driverIdOrPhone.replace(/\D/g, '').slice(-10);
    return list.filter(
      (a) =>
        a.driver_id === driverIdOrPhone ||
        a.driver?.id === driverIdOrPhone ||
        a.driver?.phone.replace(/\D/g, '').slice(-10) === cleanPhone
    );
  }

  public async getVehicleTodayStatus(vehicleIdOrReg: string): Promise<{
    vehicle: Vehicle;
    hasDutyToday: boolean;
    isAvailable: boolean;
    driver: Driver | null;
    activeTrip: Trip | null;
  } | null> {
    if (!this.state) await this.refresh();
    const v = (this.state?.vehicles || []).find(
      (veh) => veh.id === vehicleIdOrReg || veh.registration_number.toUpperCase() === vehicleIdOrReg.toUpperCase()
    );
    if (!v) return null;

    const activeTrip = (this.state?.trips || []).find(
      (t) => t.vehicle_id === v.id && (t.status === 'in_progress' || !t.end_time)
    ) || null;

    const todayStr = getTodayDateString();
    const assign = (this.state?.assignments || []).find(
      (a) => a.vehicle_id === v.id && a.duty_date === todayStr && a.status !== 'cancelled'
    );

    let driver: Driver | null = null;
    if (activeTrip && activeTrip.driver_id) {
      driver = (this.state?.drivers || []).find((d) => d.id === activeTrip.driver_id) || null;
    } else if (assign) {
      driver = (this.state?.drivers || []).find((d) => d.id === assign.driver_id) || null;
    }

    return {
      vehicle: v,
      hasDutyToday: Boolean(activeTrip || assign),
      isAvailable: !activeTrip,
      driver,
      activeTrip,
    };
  }

  // Active status helpers
  public getActiveTripForDriver(driverId: string): { trip: Trip; vehicle: Vehicle; assignment?: Assignment } | null {
    if (!this.state) return null;
    const openTrip = this.state.trips.find(
      (t) => t.driver_id === driverId && (t.status === 'in_progress' || !t.end_time)
    );
    if (!openTrip) return null;
    const vehicle = this.state.vehicles.find((v) => v.id === openTrip.vehicle_id);
    if (!vehicle) return null;
    return { trip: openTrip, vehicle };
  }

  public getActiveTripForVehicle(vehicleId: string): { trip: Trip; driver: Driver; assignment?: Assignment } | null {
    if (!this.state) return null;
    const openTrip = this.state.trips.find(
      (t) => t.vehicle_id === vehicleId && (t.status === 'in_progress' || !t.end_time)
    );
    if (!openTrip) return null;
    const driver = this.state.drivers.find((d) => d.id === openTrip.driver_id);
    if (!driver) return null;
    return { trip: openTrip, driver };
  }

  public getStartingKmForVehicle(vehicleId: string): number {
    if (!this.state) return 0;
    const vehicleTrips = this.state.trips
      .filter((t) => t.vehicle_id === vehicleId && t.end_odometer !== null && t.end_odometer !== undefined && t.status === 'completed')
      .sort((a, b) => new Date(b.end_time || b.start_time || 0).getTime() - new Date(a.end_time || a.start_time || 0).getTime());

    if (vehicleTrips.length > 0 && vehicleTrips[0].end_odometer !== null && vehicleTrips[0].end_odometer !== undefined) {
      return vehicleTrips[0].end_odometer;
    }

    const veh = this.state.vehicles.find((v) => v.id === vehicleId);
    return veh?.initial_km ?? veh?.current_odometer ?? 0;
  }

  public checkDriverRestCooldown(driverId: string): { allowed: boolean; reason?: string } {
    if (!this.state) return { allowed: true };
    const driver = this.state.drivers.find((d) => d.id === driverId);
    if (driver && (driver as unknown as { allow_next_trip_override: number }).allow_next_trip_override === 1) {
      return { allowed: true };
    }

    const activeAssignment = (this.state.assignments || []).find(
      (a) => a.driver_id === driverId && a.status === 'in_progress'
    );
    if (activeAssignment) {
      return { allowed: true };
    }

    const completedTrips = this.state.trips
      .filter((t) => t.driver_id === driverId && t.end_time && t.status === 'completed')
      .sort((a, b) => new Date(b.end_time!).getTime() - new Date(a.end_time!).getTime());

    if (completedTrips.length > 0 && completedTrips[0].end_time) {
      const lastEnd = new Date(completedTrips[0].end_time);
      const minHours = this.state.settings.min_trip_interval_hours || 6;
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

  // =========================================================================
  // SALARY & DRIVER MONTHLY SUMMARY
  // =========================================================================

  public async getDriverMonthlySummary(driverId: string, monthPrefix: string = '2026-10'): Promise<DriverMonthlySummary> {
    if (!this.state) await this.refresh();
    const drivers = this.state?.drivers || [];
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) throw new Error('Driver not found');

    const trips = (this.state?.trips || []).filter((t) => {
      if (t.driver_id !== driverId) return false;
      if (monthPrefix && monthPrefix !== 'ALL' && t.start_time) {
        return t.start_time.slice(0, 7) === monthPrefix;
      }
      return true;
    });

    const dutyDates = new Set<string>();
    let totalKm = 0;
    const vehicleMap = new Map<string, { vehicle: Vehicle; tripsCount: number; totalKm: number }>();

    const tripDetails = trips.map((t) => {
      const dateStr = t.start_time ? t.start_time.slice(0, 10) : getTodayDateString();
      dutyDates.add(dateStr);

      const distance =
        t.end_odometer !== null && t.end_odometer !== undefined && t.start_odometer !== null
          ? Math.max(0, t.end_odometer - t.start_odometer)
          : 0;

      totalKm += distance;

      const v = this.state?.vehicles.find((veh) => veh.id === t.vehicle_id);
      const vReg = v?.registration_number || 'KL Truck';
      const vModel = v?.make_model || 'Vehicle';

      if (v) {
        const existing = vehicleMap.get(v.id) || { vehicle: v, tripsCount: 0, totalKm: 0 };
        existing.tripsCount += 1;
        existing.totalKm += distance;
        vehicleMap.set(v.id, existing);
      }

      let parsedStartLoc: TripLocation | null = null;
      let parsedEndLoc: TripLocation | null = null;
      try {
        if (typeof t.start_location === 'string') parsedStartLoc = JSON.parse(t.start_location);
        else if (t.start_location) parsedStartLoc = t.start_location;
        if (typeof t.end_location === 'string') parsedEndLoc = JSON.parse(t.end_location);
        else if (t.end_location) parsedEndLoc = t.end_location;
      } catch {}

      return {
        tripId: t.id,
        dutyDate: dateStr,
        vehicleRegistration: vReg,
        vehicleModel: vModel,
        destination: t.destination || t.route_name || 'Completed Route',
        routeName: t.route_name || 'Standard Route',
        startOdo: t.start_odometer,
        endOdo: t.end_odometer || null,
        distance,
        notes: t.driver_notes,
        status: t.status,
        startTime: t.start_time || '',
        endTime: t.end_time || null,
        startLocation: parsedStartLoc,
        endLocation: parsedEndLoc,
        editedByOwnerAt: (t as unknown as { edited_by_owner_at?: string }).edited_by_owner_at || null,
      };
    });

    return {
      driver,
      month: monthPrefix,
      totalKilometers: totalKm,
      totalDaysWorked: dutyDates.size,
      totalTripsCount: trips.length,
      vehiclesBreakdown: Array.from(vehicleMap.values()),
      tripDetails,
    };
  }

  // =========================================================================
  // VEHICLE REPORT & DETAIL
  // =========================================================================

  public async getVehicleDetail(vehicleId: string, monthPrefix: string = '2026-10'): Promise<VehicleDetailReport | null> {
    if (!this.state) await this.refresh();
    const cleanQuery = vehicleId.trim().toUpperCase().replace(/\s+/g, '');
    const vehicle = this.state?.vehicles.find((v) =>
      v.id === vehicleId ||
      v.registration_number.toUpperCase().replace(/\s+/g, '') === cleanQuery ||
      v.registration_number.toUpperCase().replace(/\s+/g, '').includes(cleanQuery)
    );
    if (!vehicle) return null;

    const detailedExpenses = await this.getExpenses({ vehicleId: vehicle.id, monthPrefix });

    let fuelTotal = 0;
    let fuelLitresTotal = 0;
    let tollTotal = 0;
    let maintenanceTotal = 0;
    let otherTotal = 0;

    detailedExpenses.forEach((exp) => {
      switch (exp.expense_type) {
        case 'Fuel':
          fuelTotal += exp.amount;
          if (exp.litres) fuelLitresTotal += exp.litres;
          break;
        case 'Toll':
          tollTotal += exp.amount;
          break;
        case 'Maintenance':
          maintenanceTotal += exp.amount;
          break;
        default:
          otherTotal += exp.amount;
      }
    });

    const totalExpense = fuelTotal + tollTotal + maintenanceTotal + otherTotal;

    let monthlyIncome = 0;
    if (monthPrefix && monthPrefix !== 'ALL') {
      const incRec = this.state?.vehicleIncomes.find((i) => i.vehicle_id === vehicle.id && i.month === monthPrefix);
      monthlyIncome = incRec ? (typeof incRec.amount === 'number' ? incRec.amount : Number(incRec.amount) || 0) : 0;
    } else {
      monthlyIncome = (this.state?.vehicleIncomes || [])
        .filter((i) => i.vehicle_id === vehicle.id)
        .reduce((sum, i) => sum + (typeof i.amount === 'number' ? i.amount : Number(i.amount) || 0), 0);
    }
    const profitOrLoss = monthlyIncome - totalExpense;

    const vehicleTrips = (this.state?.trips || [])
      .filter((t) => {
        if (t.vehicle_id !== vehicle.id) return false;
        if (monthPrefix && monthPrefix !== 'ALL' && t.start_time) {
          return t.start_time.slice(0, 7) === monthPrefix;
        }
        return true;
      })
      .sort((a, b) => new Date(b.start_time || 0).getTime() - new Date(a.start_time || 0).getTime());

    const distinctDates = new Set<string>();
    let totalMonthKm = 0;
    const driverStatsMap = new Map<string, VehicleMonthlyDriverStats>();

    for (const t of vehicleTrips) {
      if (t.start_time) distinctDates.add(t.start_time.slice(0, 10));
      const dist = (t.end_odometer !== null && t.end_odometer !== undefined && t.start_odometer !== null)
        ? Math.max(0, t.end_odometer - t.start_odometer)
        : 0;
      totalMonthKm += dist;

      const d = this.state?.drivers.find((drv) => drv.id === t.driver_id);
      const dId = t.driver_id || 'unknown';
      const existing = driverStatsMap.get(dId) || {
        driverId: dId,
        driverName: d?.full_name || 'Driver',
        driverPhone: d?.phone || '',
        employeeCode: d?.employee_code || '',
        daysCount: 0,
        tripsCount: 0,
        totalKm: 0,
        dates: [],
      };
      existing.tripsCount += 1;
      existing.totalKm += dist;
      if (t.start_time && !existing.dates.includes(t.start_time.slice(0, 10))) {
        existing.dates.push(t.start_time.slice(0, 10));
        existing.daysCount += 1;
      }
      driverStatsMap.set(dId, existing);
    }

    const travelHistory: VehicleTravelHistoryTrip[] = vehicleTrips.map((t) => {
      const d = this.state?.drivers.find((drv) => drv.id === t.driver_id);
      const dist = (t.end_odometer !== null && t.end_odometer !== undefined && t.start_odometer !== null)
        ? Math.max(0, t.end_odometer - t.start_odometer)
        : 0;

      let startLoc: TripLocation | null = null;
      let endLoc: TripLocation | null = null;
      try {
        if (typeof t.start_location === 'string') startLoc = JSON.parse(t.start_location);
        else if (t.start_location) startLoc = t.start_location;
        if (typeof t.end_location === 'string') endLoc = JSON.parse(t.end_location);
        else if (t.end_location) endLoc = t.end_location;
      } catch {}

      const isStartValid =
        startLoc &&
        !('no_location' in startLoc) &&
        (startLoc.place_name || startLoc.address || (typeof startLoc.latitude === 'number' && startLoc.latitude !== 0));

      const isEndValid =
        endLoc &&
        !('no_location' in endLoc) &&
        (endLoc.place_name || endLoc.address || (typeof endLoc.latitude === 'number' && endLoc.latitude !== 0));

      const startPlace =
        (t as unknown as { start_place_name?: string }).start_place_name ||
        (t.route_name && t.route_name !== 'Route in progress' && t.route_name !== 'Direct Route'
          ? t.route_name
          : null) ||
        (isStartValid ? (startLoc?.place_name || startLoc?.address) : null) ||
        'Location not available';

      const endPlace =
        (t as unknown as { end_place_name?: string }).end_place_name ||
        (t.destination && t.destination !== 'Route in progress' && t.destination !== 'Completed Route' && t.destination !== 'Manual Entry'
          ? t.destination
          : null) ||
        (isEndValid ? (endLoc?.place_name || endLoc?.address) : null) ||
        'Location not available';

      return {
        tripId: t.id,
        dutyDate: t.start_time ? t.start_time.slice(0, 10) : getTodayDateString(),
        driverId: t.driver_id,
        driverName: d?.full_name || 'Driver',
        driverPhone: d?.phone || '',
        routeName: t.route_name || startPlace,
        destination: t.destination || endPlace,
        distance: dist,
        startPlace,
        endPlace,
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

    return {
      vehicle,
      selectedMonth: monthPrefix,
      company: vehicle.company || 'Delhivery',
      routeLocation: vehicle.route_location || 'Ad-hoc',
      defaultDrivers: (vehicle.default_driver_names || []).join(', ') || 'Direct',
      driversWhoDrove: Array.from(driverStatsMap.values()),
      totalDriversCount: driverStatsMap.size,
      totalDaysOperated: distinctDates.size,
      totalTripsCount: vehicleTrips.length,
      totalMonthKm: Math.round(totalMonthKm * 10) / 10,
      monthlyIncome,
      profitOrLoss,
      travelHistory,
      expenseSummary: {
        fuelTotal,
        tollTotal,
        maintenanceTotal,
        otherTotal,
        totalExpense,
      },
      expenses: {
        totals: {
          fuel: fuelTotal,
          fuelLitres: Math.round(fuelLitresTotal * 10) / 10,
          toll: tollTotal,
          maintenance: maintenanceTotal,
          other: otherTotal,
          grandTotal: totalExpense,
        },
        entries: detailedExpenses,
      },
    };
  }

  public async getVehicleTravelHistory(vehicleIdOrReg: string): Promise<VehicleTravelHistory> {
    if (!this.state) await this.refresh();
    const v = (this.state?.vehicles || []).find(
      (veh) => veh.id === vehicleIdOrReg || veh.registration_number.toUpperCase() === vehicleIdOrReg.toUpperCase()
    );
    if (!v) throw new Error('Vehicle not found');

    const detail = await this.getVehicleDetail(v.id, 'ALL');
    const trips = detail?.travelHistory || [];
    const totalKm = trips.reduce((acc, t) => acc + t.distanceKm, 0);

    const driversMap = new Map<string, { driver: Driver; tripsCount: number; totalKm: number }>();
    for (const t of trips) {
      const d = (this.state?.drivers || []).find((drv) => drv.id === t.driverId);
      if (d) {
        const existing = driversMap.get(d.id) || { driver: d, tripsCount: 0, totalKm: 0 };
        existing.tripsCount += 1;
        existing.totalKm += t.distanceKm;
        driversMap.set(d.id, existing);
      }
    }

    return {
      vehicle: v,
      totalKm: Math.round(totalKm * 10) / 10,
      totalTrips: trips.length,
      totalRecordedDistance: Math.round(totalKm * 10) / 10,
      tripsCount: trips.length,
      uniqueDrivers: Array.from(driversMap.values()),
      history: trips,
    };
  }

  // =========================================================================
  // COMPANY REPORT
  // =========================================================================

  public async getCompanyMonthlyReport(companyId: string, monthPrefix: string = '2026-10'): Promise<CompanyMonthlyReport | null> {
    if (!this.state) await this.refresh();
    const comp = this.state?.companies.find((c) => c.id === companyId);
    if (!comp) return null;

    const companyVehicles = (this.state?.vehicles || []).filter(
      (v) =>
        (v.company_id && v.company_id === companyId) ||
        (v.company || '').toLowerCase() === comp.name.toLowerCase() ||
        (v.company_name && v.company_name.toLowerCase() === comp.name.toLowerCase())
    );

    let activeTripsCount = 0;
    for (const v of companyVehicles) {
      if (v.status === 'on_trip' || this.getActiveTripForVehicle(v.id) !== null) {
        activeTripsCount += 1;
      }
    }

    const vehicleBreakdowns = await Promise.all(
      companyVehicles.map(async (v) => {
        const vDetail = await this.getVehicleDetail(v.id, monthPrefix);
        const fuel = vDetail?.expenseSummary?.fuelTotal || 0;
        const toll = vDetail?.expenseSummary?.tollTotal || 0;
        const maint = vDetail?.expenseSummary?.maintenanceTotal || 0;
        const other = vDetail?.expenseSummary?.otherTotal || 0;
        const totExp = fuel + toll + maint + other;
        const inc = vDetail?.monthlyIncome ?? 0;
        const pOrL = inc - totExp;

        const totalKm = (vDetail?.travelHistory || []).reduce((acc, t) => acc + t.distanceKm, 0);

        return {
          vehicle: v,
          fuelExpense: fuel,
          tollExpense: toll,
          maintenanceExpense: maint,
          totalExpense: totExp,
          income: inc,
          profitOrLoss: pOrL,
          tripsCount: vDetail?.travelHistory.length || 0,
          totalKm: Math.round(totalKm * 10) / 10,
        };
      })
    );

    const compTotalExpense = vehicleBreakdowns.reduce((sum, v) => sum + v.totalExpense, 0);
    const compTotalIncome = vehicleBreakdowns.reduce((sum, v) => sum + v.income, 0);
    const compProfitOrLoss = compTotalIncome - compTotalExpense;

    return {
      company: comp,
      month: monthPrefix,
      totalIncome: compTotalIncome,
      totalExpenses: compTotalExpense,
      profitOrLoss: compProfitOrLoss,
      vehiclesCount: companyVehicles.length,
      activeTripsCount,
      vehicles: vehicleBreakdowns,
    };
  }

  public async getReportRawData(company?: string) {
    if (!this.state) await this.refresh();
    let vList = this.state?.vehicles || [];
    if (company && company !== 'all' && company !== 'All') {
      vList = vList.filter((v) => (v.company || v.company_name || '').toLowerCase() === company.toLowerCase());
    }
    const vIds = new Set(vList.map((v) => v.id));
    const filteredAssignments = (this.state?.assignments || []).filter((a) => vIds.has(a.vehicle_id));
    const aIds = new Set(filteredAssignments.map((a) => a.id));
    const filteredTrips = (this.state?.trips || []).filter((t) => (t.assignment_id && aIds.has(t.assignment_id)) || (t.vehicle_id && vIds.has(t.vehicle_id)));
    const filteredExpenses = (this.state?.expenses || []).filter((e) => vIds.has(e.vehicle_id));

    return {
      assignments: filteredAssignments,
      trips: filteredTrips,
      drivers: this.state?.drivers || [],
      vehicles: vList,
      routes: this.state?.routes || [],
      teams: this.state?.teams || [],
      expenses: filteredExpenses,
    };
  }

  public async getDashboardMetrics(): Promise<DashboardMetrics> {
    if (!this.state) await this.refresh();
    const vehicles = this.state?.vehicles || [];
    const drivers = this.state?.drivers || [];
    const assignments = this.state?.assignments || [];
    const trips = this.state?.trips || [];

    const activeVehicles = vehicles.filter((v) => v.status === 'on_trip' || v.status === 'active').length;
    const maintenanceVehicles = vehicles.filter((v) => v.status === 'maintenance' || v.status === 'inactive' || v.is_active === false).length;
    const activeDrivers = drivers.filter((d) => d.status === 'on_trip' || d.status === 'active' || d.is_active === true).length;
    const activeTripsCount = trips.filter((t) => t.status === 'in_progress' || !t.end_time).length;
    const completedTripsCount = trips.filter((t) => t.status === 'completed').length;

    const todayStr = getTodayDateString();
    const todayAssigns = assignments.filter((a) => a.duty_date === todayStr);

    return {
      totalVehicles: vehicles.length,
      activeVehicles,
      maintenanceVehicles,
      totalDrivers: drivers.length,
      activeDrivers,
      todayAssignmentsCount: todayAssigns.length,
      pendingConfirmationsCount: todayAssigns.filter((a) => a.status === 'scheduled').length,
      activeTripsCount,
      completedTripsCount,
      cancelledDutiesCount: todayAssigns.filter((a) => a.status === 'cancelled').length,
    };
  }

  public async getVehicleMonthlyIncome(vehicleId: string, monthPrefix?: string): Promise<number> {
    if (!this.state) await this.refresh();
    const targetMonth = monthPrefix || getCurrentMonthPrefix();
    const inc = (this.state?.vehicleIncomes || []).find((i) => i.vehicle_id === vehicleId && i.month === targetMonth);
    return inc ? (typeof inc.amount === 'number' ? inc.amount : Number(inc.amount) || 0) : 0;
  }

  // =========================================================================
  // MUTATION ACTIONS (SINGLE SOURCE OF TRUTH VIA BACKEND DISPATCH)
  // =========================================================================

  public async startTrip(params: {
    assignmentId?: string;
    startOdometer: number;
    actualDestination?: string;
    destination?: string;
    notes?: string;
    startLocation?: TripLocation | null;
  }): Promise<Trip> {
    const res = await this.dispatchAction<{ trip: Trip }>('startTrip', {
      assignmentId: params.assignmentId,
      startOdometer: params.startOdometer,
      destination: params.destination || params.actualDestination,
      notes: params.notes,
      startLocation: params.startLocation,
    });
    return res.trip;
  }

  public async startTripForDriver(data: {
    driverPhoneOrId: string;
    vehicleId: string;
    startOdometer: number;
    destination?: string;
    startLocation?: TripLocation | null;
    notes?: string;
  }): Promise<Trip> {
    const res = await this.dispatchAction<{ trip: Trip }>('startTrip', {
      driverPhoneOrId: data.driverPhoneOrId,
      vehicleId: data.vehicleId,
      startOdometer: data.startOdometer,
      startLocation: data.startLocation,
      destination: data.destination,
      notes: data.notes,
    });
    if (res.trip && this.state) {
      if (!this.state.trips) this.state.trips = [];
      this.state.trips = [res.trip, ...this.state.trips.filter((t) => t.id !== res.trip.id)];
      if (this.state.vehicles) {
        this.state.vehicles = this.state.vehicles.map((v) =>
          v.id === data.vehicleId
            ? { ...v, current_odometer: data.startOdometer, active_trip: res.trip, trip_status: 'on_trip' }
            : v
        );
      }
      this.notify();
    }
    return res.trip;
  }

  public async completeTrip(data: {
    tripId: string;
    endOdometer: number;
    notes?: string | null;
    endLocation?: TripLocation | null;
    isFinalTripOfDuty?: boolean;
    expenses?: Array<{ expense_type: ExpenseType; amount: number; litres?: number; note?: string }>;
  }): Promise<{ distanceKm: number; trip: Trip }> {
    const res = await this.dispatchAction<{ distanceKm: number; trip: Trip }>('endTrip', {
      tripId: data.tripId,
      endOdometer: data.endOdometer,
      notes: data.notes,
      endLocation: data.endLocation,
      isFinalTripOfDuty: data.isFinalTripOfDuty,
      expenses: data.expenses,
    });
    if (res.trip && this.state) {
      if (!this.state.trips) this.state.trips = [];
      this.state.trips = [res.trip, ...this.state.trips.filter((t) => t.id !== res.trip.id)];
      if (this.state.vehicles) {
        this.state.vehicles = this.state.vehicles.map((v) =>
          v.id === res.trip.vehicle_id
            ? { ...v, current_odometer: data.endOdometer, active_trip: null, trip_status: 'idle' }
            : v
        );
      }
      this.notify();
    }
    return res;
  }

  public async createExpense(data: {
    tripId?: string;
    vehicle_id: string;
    driver_id: string;
    expense_type: ExpenseType;
    amount: number;
    litres?: number | null;
    note?: string | null;
    date?: string;
    isOwner?: boolean;
  }): Promise<Expense> {
    const res = await this.dispatchAction<{ expense: Expense }>('createExpense', {
      tripId: data.tripId,
      vehicleId: data.vehicle_id,
      driverId: data.driver_id,
      expenseType: data.expense_type,
      amount: data.amount,
      litres: data.litres,
      note: data.note,
      date: data.date,
      isOwner: data.isOwner,
    });
    if (res.expense && this.state) {
      if (!this.state.expenses) this.state.expenses = [];
      this.state.expenses = [res.expense, ...this.state.expenses.filter((e) => e.id !== res.expense.id)];
      this.notify();
    }
    return res.expense;
  }

  public async updateExpense(
    id: string,
    data: {
      expense_type?: ExpenseType;
      amount?: number;
      litres?: number | null;
      note?: string | null;
      date?: string;
    }
  ): Promise<Expense> {
    const res = await this.dispatchAction<{ expense: Expense }>('updateExpense', {
      id,
      data: {
        expenseType: data.expense_type,
        amount: data.amount,
        litres: data.litres,
        note: data.note,
        date: data.date,
      },
    });
    return res.expense;
  }

  public async deleteExpense(id: string): Promise<{ success: boolean; deletedRows: number }> {
    if (this.state?.expenses) {
      this.state.expenses = this.state.expenses.filter((e) => e.id !== id);
      this.notify();
    }
    return this.dispatchAction<{ success: boolean; deletedRows: number }>('deleteExpense', { id });
  }

  public async updateTrip(
    id: string,
    data: {
      driver_id?: string;
      vehicle_id?: string;
      start_odometer?: number;
      end_odometer?: number;
      start_time?: string;
      end_time?: string;
      route_name?: string;
      destination?: string;
      start_place?: string;
      end_place?: string;
      driver_notes?: string | null;
    }
  ): Promise<Trip> {
    const res = await this.dispatchAction<{ trip: Trip }>('updateTrip', {
      id,
      data: {
        driverId: data.driver_id,
        vehicleId: data.vehicle_id,
        startOdometer: data.start_odometer,
        endOdometer: data.end_odometer,
        startTime: data.start_time,
        endTime: data.end_time,
        routeName: data.route_name,
        destination: data.destination,
        startPlace: data.start_place,
        endPlace: data.end_place,
        driverNotes: data.driver_notes,
      },
    });
    return res.trip;
  }

  public async deleteTrip(id: string): Promise<{ success: boolean; deletedRows: number; deletedExpenseIds: string[] }> {
    if (this.state) {
      if (this.state.trips) {
        this.state.trips = this.state.trips.filter((t) => t.id !== id);
      }
      if (this.state.expenses) {
        this.state.expenses = this.state.expenses.filter((e) => e.trip_id !== id);
      }
      this.notify();
    }
    return this.dispatchAction<{ success: boolean; deletedRows: number; deletedExpenseIds: string[] }>('deleteTrip', { id });
  }

  public async addManualTrip(data: {
    driver_id?: string;
    driverId?: string;
    vehicle_id?: string;
    vehicleId?: string;
    start_odometer?: number;
    startOdometer?: number;
    end_odometer?: number;
    endOdometer?: number;
    start_time?: string;
    startTime?: string;
    end_time?: string;
    endTime?: string;
    route_name?: string;
    routeName?: string;
    destination?: string;
    start_place?: string;
    startPlace?: string;
    end_place?: string;
    endPlace?: string;
    driver_notes?: string;
    driverNotes?: string;
    notes?: string;
  }): Promise<Trip> {
    const res = await this.dispatchAction<{ trip: Trip }>('addManualTrip', {
      driverId: data.driverId || data.driver_id,
      vehicleId: data.vehicleId || data.vehicle_id,
      startOdometer: data.startOdometer ?? data.start_odometer,
      endOdometer: data.endOdometer ?? data.end_odometer,
      startTime: data.startTime || data.start_time,
      endTime: data.endTime || data.end_time,
      routeName: data.routeName || data.route_name || data.startPlace || data.start_place,
      destination: data.destination || data.endPlace || data.end_place,
      driverNotes: data.driverNotes || data.driver_notes || data.notes,
    });
    return res.trip;
  }

  public async createDriver(data: {
    full_name?: string;
    fullName?: string;
    phone: string;
    pin?: string;
  }): Promise<Driver> {
    const res = await this.dispatchAction<{ driver: Driver }>('createDriver', {
      fullName: data.fullName || data.full_name,
      phone: data.phone,
      pin: data.pin,
    });
    if (res.driver && this.state) {
      if (!this.state.drivers) this.state.drivers = [];
      const enhancedDriver = {
        ...res.driver,
        current_vehicle: null,
        active_trip: null,
        trip_status: 'idle' as const,
      };
      this.state.drivers = [enhancedDriver as any, ...this.state.drivers.filter((d) => d.id !== res.driver.id)];
      this.notify();
    }
    return res.driver;
  }

  public async updateDriver(
    id: string,
    data: {
      full_name?: string;
      phone?: string;
      pin?: string;
      is_active?: boolean;
      allow_next_trip_override?: number;
    }
  ): Promise<Driver> {
    if (this.state?.drivers) {
      this.state.drivers = this.state.drivers.map((d) =>
        d.id === id
          ? {
              ...d,
              full_name: data.full_name ?? d.full_name,
              phone: data.phone ?? d.phone,
              pin: data.pin ?? d.pin,
              is_active: data.is_active !== undefined ? data.is_active : d.is_active,
              allow_next_trip_override:
                data.allow_next_trip_override !== undefined
                  ? data.allow_next_trip_override
                  : (d as unknown as { allow_next_trip_override?: number }).allow_next_trip_override,
            }
          : d
      );
      this.notify();
    }

    const res = await this.dispatchAction<{ driver: Driver }>('updateDriver', {
      id,
      data: {
        fullName: data.full_name,
        phone: data.phone,
        pin: data.pin,
        isActive: data.is_active,
      },
    });
    return res.driver;
  }

  public async allowDriverNextTripOverride(driverId: string, enabled: boolean = true): Promise<void> {
    const overrideVal = enabled ? 1 : 0;
    if (this.state?.drivers) {
      this.state.drivers = this.state.drivers.map((d) =>
        d.id === driverId
          ? {
              ...d,
              allow_next_trip_override: overrideVal,
            }
          : d
      );
      this.notify();
    }
    await this.dispatchAction('allowDriverOverride', { driverId, enabled });
  }

  public async archiveDriver(id: string): Promise<boolean> {
    const res = await this.deleteDriver(id);
    return res.success;
  }

  public async deleteDriver(id: string): Promise<{ success: boolean; deletedRows: number; deletedTripIds: string[]; deletedExpenseIds: string[] }> {
    if (this.state) {
      if (this.state.drivers) {
        this.state.drivers = this.state.drivers.filter((d) => d.id !== id);
      }
      const driverTripIds = new Set(
        (this.state.trips || []).filter((t) => t.driver_id === id).map((t) => t.id)
      );
      if (this.state.trips) {
        this.state.trips = this.state.trips.filter((t) => t.driver_id !== id);
      }
      if (this.state.expenses) {
        this.state.expenses = this.state.expenses.filter(
          (e) => e.driver_id !== id && (!e.trip_id || !driverTripIds.has(e.trip_id))
        );
      }
      if (this.state.assignments) {
        this.state.assignments = this.state.assignments.filter((a) => a.driver_id !== id);
      }
      this.notify();
    }
    return this.dispatchAction<{ success: boolean; deletedRows: number; deletedTripIds: string[]; deletedExpenseIds: string[] }>('deleteDriver', { id });
  }

  public async createVehicle(data: {
    registration_number: string;
    make_model: string;
    company_id?: string;
    company?: string;
    vehicle_type?: string;
    initial_km?: number;
    current_odometer?: number;
    capacity?: number;
    status?: string;
    notes?: string | null;
    route_location?: string;
  }): Promise<Vehicle> {
    let compId = data.company_id;
    if (!compId && data.company) {
      const companies = await this.getCompanies();
      const matched = companies.find((c) => c.name.toLowerCase() === data.company!.toLowerCase());
      compId = matched?.id || 'comp-delhivery';
    }

    const res = await this.dispatchAction<{ vehicle: Vehicle }>('createVehicle', {
      registrationNumber: data.registration_number,
      makeModel: data.make_model,
      companyId: compId || 'comp-delhivery',
      vehicleType: data.vehicle_type,
      initialKm: data.initial_km ?? data.current_odometer,
      routeLocation: data.route_location,
    });
    if (res.vehicle && this.state) {
      if (!this.state.vehicles) this.state.vehicles = [];
      const enhancedVeh = {
        ...res.vehicle,
        company_name: res.vehicle.company || '',
        current_driver: null,
        active_trip: null,
        trip_status: 'idle' as const,
      };
      this.state.vehicles = [enhancedVeh as any, ...this.state.vehicles.filter((v) => v.id !== res.vehicle.id)];
      this.notify();
    }
    return res.vehicle;
  }

  public async updateVehicle(
    id: string,
    data: {
      registration_number?: string;
      make_model?: string;
      company_id?: string;
      company?: string;
      vehicle_type?: string;
      initial_km?: number;
      current_odometer?: number;
      route_location?: string;
      is_active?: boolean;
    }
  ): Promise<Vehicle> {
    let compId = data.company_id;
    if (!compId && data.company) {
      const companies = await this.getCompanies();
      const matched = companies.find((c) => c.name.toLowerCase() === data.company!.toLowerCase());
      if (matched) compId = matched.id;
    }

    // Immediately update in-memory state so getVehicleDetail and UI views see updated name/model immediately
    if (this.state?.vehicles) {
      this.state.vehicles = this.state.vehicles.map((v) => {
        if (v.id === id) {
          return {
            ...v,
            registration_number: data.registration_number ?? v.registration_number,
            make_model: data.make_model ?? v.make_model,
            company: data.company ?? v.company,
            company_id: compId ?? v.company_id,
            vehicle_type: (data.vehicle_type as any) ?? v.vehicle_type,
            initial_km: data.initial_km ?? v.initial_km,
            current_odometer: data.current_odometer ?? v.current_odometer,
            route_location: data.route_location !== undefined ? data.route_location : v.route_location,
            is_active: data.is_active !== undefined ? data.is_active : v.is_active,
            status: data.is_active !== undefined ? (data.is_active ? 'active' : 'inactive') : v.status,
          };
        }
        return v;
      });
      this.notify();
    }

    const res = await this.dispatchAction<{ vehicle: Vehicle }>('updateVehicle', {
      id,
      data: {
        registrationNumber: data.registration_number,
        makeModel: data.make_model,
        companyId: compId,
        vehicleType: data.vehicle_type,
        initialKm: data.initial_km,
        currentOdometer: data.current_odometer,
        routeLocation: data.route_location,
        isActive: data.is_active,
      },
    });
    return res.vehicle;
  }

  public async archiveVehicle(id: string): Promise<boolean> {
    const res = await this.deleteVehicle(id);
    return res.success;
  }

  public async deleteVehicle(id: string): Promise<{ success: boolean; deletedRows: number; deletedTripIds: string[]; deletedExpenseIds: string[] }> {
    if (this.state) {
      if (this.state.vehicles) {
        this.state.vehicles = this.state.vehicles.filter((v) => v.id !== id);
      }
      const vehicleTripIds = new Set(
        (this.state.trips || []).filter((t) => t.vehicle_id === id).map((t) => t.id)
      );
      if (this.state.trips) {
        this.state.trips = this.state.trips.filter((t) => t.vehicle_id !== id);
      }
      if (this.state.expenses) {
        this.state.expenses = this.state.expenses.filter(
          (e) => e.vehicle_id !== id && (!e.trip_id || !vehicleTripIds.has(e.trip_id))
        );
      }
      if (this.state.vehicleIncomes) {
        this.state.vehicleIncomes = this.state.vehicleIncomes.filter((vi) => vi.vehicle_id !== id);
      }
      if (this.state.assignments) {
        this.state.assignments = this.state.assignments.filter((a) => a.vehicle_id !== id);
      }
      this.notify();
    }
    return this.dispatchAction<{ success: boolean; deletedRows: number; deletedTripIds: string[]; deletedExpenseIds: string[] }>('deleteVehicle', { id });
  }

  public async createCompany(data: { name: string; contact_person?: string; contact_phone?: string }): Promise<Company> {
    const res = await this.dispatchAction<{ company: Company }>('createCompany', {
      name: data.name,
      contactPerson: data.contact_person,
      contactPhone: data.contact_phone,
    });
    return res.company;
  }

  public async updateCompany(
    id: string,
    data: { name?: string; contact_person?: string; contact_phone?: string; is_active?: boolean }
  ): Promise<Company> {
    if (this.state?.companies) {
      this.state.companies = this.state.companies.map((c) =>
        c.id === id
          ? {
              ...c,
              name: data.name ?? c.name,
              contact_person: data.contact_person ?? c.contact_person,
              contact_phone: data.contact_phone ?? c.contact_phone,
              is_active: data.is_active !== undefined ? data.is_active : c.is_active,
            }
          : c
      );
      this.notify();
    }

    const res = await this.dispatchAction<{ company: Company }>('updateCompany', {
      id,
      data: {
        name: data.name,
        contactPerson: data.contact_person,
        contactPhone: data.contact_phone,
        isActive: data.is_active,
      },
    });
    return res.company;
  }

  public async deleteCompany(id: string): Promise<{ success: boolean; deletedRows: number; deletedVehicleIds: string[]; deletedTripIds: string[]; deletedExpenseIds: string[] }> {
    if (this.state) {
      const companyVehicleIds = new Set(
        (this.state.vehicles || []).filter((v) => v.company_id === id).map((v) => v.id)
      );
      const companyTripIds = new Set(
        (this.state.trips || []).filter((t) => t.vehicle_id && companyVehicleIds.has(t.vehicle_id)).map((t) => t.id)
      );
      this.state.companies = (this.state.companies || []).filter((c) => c.id !== id);
      this.state.vehicles = (this.state.vehicles || []).filter((v) => !companyVehicleIds.has(v.id));
      this.state.trips = (this.state.trips || []).filter((t) => !t.vehicle_id || !companyVehicleIds.has(t.vehicle_id));
      this.state.expenses = (this.state.expenses || []).filter(
        (e) => !companyVehicleIds.has(e.vehicle_id) && (!e.trip_id || !companyTripIds.has(e.trip_id))
      );
      this.state.vehicleIncomes = (this.state.vehicleIncomes || []).filter((vi) => !companyVehicleIds.has(vi.vehicle_id));
      this.state.assignments = (this.state.assignments || []).filter((a) => !companyVehicleIds.has(a.vehicle_id));
      this.notify();
    }
    return this.dispatchAction<{ success: boolean; deletedRows: number; deletedVehicleIds: string[]; deletedTripIds: string[]; deletedExpenseIds: string[] }>('deleteCompany', { id });
  }

  public async getLinkedCounts(
    type: 'driver' | 'vehicle' | 'company' | 'trip',
    id: string
  ): Promise<{ tripsCount: number; expensesCount: number; vehiclesCount?: number }> {
    return this.dispatchAction('getLinkedCounts', { type, id });
  }

  public async createAssignment(data: {
    duty_date: string;
    driver_id: string;
    vehicle_id: string;
    route_id?: string | null;
    team_id?: string | null;
    planned_start_time?: string;
    planned_end_time?: string;
    notes?: string | null;
  }): Promise<Assignment> {
    const res = await this.dispatchAction<{ assignment: Assignment }>('createAssignment', data);
    return res.assignment;
  }

  public async updateAssignment(id: string, data: Partial<Assignment>): Promise<Assignment> {
    const res = await this.dispatchAction<{ assignment: Assignment }>('updateAssignment', { id, data });
    return res.assignment;
  }

  public async reassignAssignment(params: {
    assignmentId: string;
    newDriverId?: string;
    newVehicleId?: string;
    reason?: string;
  }): Promise<Assignment> {
    const res = await this.dispatchAction<{ assignment: Assignment }>('reassignAssignment', params);
    return res.assignment;
  }

  public async confirmDuty(assignmentId: string): Promise<Assignment> {
    const res = await this.dispatchAction<{ assignment: Assignment }>('confirmDuty', { assignmentId });
    return res.assignment;
  }

  public async assignDriverAdhocVehicle(
    driverPhoneOrId: string,
    vehicleId: string,
    routeLocation?: string
  ): Promise<AssignmentWithDetails> {
    const res = await this.dispatchAction<{ assignment: AssignmentWithDetails }>('assignDriverAdhocVehicle', {
      driverPhoneOrId,
      vehicleId,
      routeLocation,
    });
    return res.assignment;
  }

  public async createRoute(data: Omit<Route, 'id' | 'created_at' | 'updated_at'>): Promise<Route> {
    const res = await this.dispatchAction<{ route: Route }>('createRoute', data);
    return res.route;
  }

  public async updateRoute(id: string, data: Partial<Route>): Promise<Route> {
    const res = await this.dispatchAction<{ route: Route }>('updateRoute', { id, data });
    return res.route;
  }

  public async createTeam(data: Omit<Team, 'id' | 'created_at' | 'updated_at'>): Promise<Team> {
    const res = await this.dispatchAction<{ team: Team }>('createTeam', data);
    return res.team;
  }

  public async updateTeam(id: string, data: Partial<Team>): Promise<Team> {
    const res = await this.dispatchAction<{ team: Team }>('updateTeam', { id, data });
    return res.team;
  }

  public async recordMaintenance(params: {
    vehicleId?: string;
    vehicle_id?: string;
    amount: number;
    description?: string;
    issue_type?: string;
    workshop_name?: string;
    set_vehicle_maintenance_status?: boolean;
    date?: string;
  }): Promise<Expense & { success: boolean; expenseId: string }> {
    return this.dispatchAction('recordMaintenance', {
      vehicleId: params.vehicleId || params.vehicle_id,
      amount: params.amount,
      description: params.description,
      issue_type: params.issue_type,
      workshop_name: params.workshop_name,
      set_vehicle_maintenance_status: params.set_vehicle_maintenance_status,
      date: params.date,
    });
  }

  public async getSettings(): Promise<{ min_trip_interval_hours: number; owner_password: string; [key: string]: any }> {
    if (!this.state) await this.refresh();
    return (
      this.state?.settings || {
        min_trip_interval_hours: 6,
        owner_password: 'kore2026',
      }
    );
  }

  public async allowDriverOverride(driverId: string, enabled: boolean = true): Promise<void> {
    return this.allowDriverNextTripOverride(driverId, enabled);
  }

  public async setVehicleMonthlyIncome(vehicleId: string, month: string, amount: number): Promise<void> {
    const numAmount = typeof amount === 'number' ? amount : (parseFloat(String(amount)) || 0);
    const validAmount = isNaN(numAmount) ? 0 : Math.max(0, numAmount);

    if (this.state) {
      if (!this.state.vehicleIncomes) {
        this.state.vehicleIncomes = [];
      }
      const existingIdx = this.state.vehicleIncomes.findIndex(
        (i) => i.vehicle_id === vehicleId && i.month === month
      );
      const rec = {
        id: `${vehicleId}_${month}`,
        vehicle_id: vehicleId,
        month,
        amount: validAmount,
        updated_at: new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        this.state.vehicleIncomes[existingIdx] = rec;
      } else {
        this.state.vehicleIncomes.push(rec);
      }
      this.notify();
    }

    await this.dispatchAction('setVehicleIncome', {
      vehicleId,
      month,
      amount: validAmount,
    });
  }

  public async updateSettings(key: string, value: string): Promise<void> {
    await this.dispatchAction('updateSetting', { key, value });
  }
}

// Global Singleton
export const dataRepo = new ServerFleetRepository();
