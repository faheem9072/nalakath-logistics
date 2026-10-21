import {
  Profile,
  Vehicle,
  Driver,
  Team,
  Route,
  Assignment,
  AssignmentStatus,
  Trip,
  AssignmentEvent,
  AuditLog,
  Expense,
  ExpenseType,
  TripLocation,
} from '@/types/database';
import {
  AssignmentWithDetails,
  TripWithDetails,
  DashboardMetrics,
  ExpenseWithDetails,
  VehicleDetailReport,
  VehicleMonthlyDriverStats,
  VehicleTravelHistoryTrip,
} from '@/types/models';
import {
  INITIAL_PROFILES,
  INITIAL_TEAMS,
  INITIAL_ROUTES,
  INITIAL_VEHICLES,
  INITIAL_DRIVERS,
  INITIAL_ASSIGNMENTS,
  INITIAL_TRIPS,
  INITIAL_EVENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_EXPENSES,
  getTodayDateString,
  getCurrentMonthPrefix,
} from './mock/mock-store';
import { checkScheduleConflicts } from './utils/conflict-detector';
import { calculateTripDistance } from './utils/odometer-calculator';

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
  }[];
}

export interface VehicleTravelHistory {
  vehicle: Vehicle;
  totalRecordedDistance: number;
  tripsCount: number;
  uniqueDrivers: {
    driver: Driver;
    tripsCount: number;
    totalKm: number;
  }[];
  history: {
    tripId: string;
    dutyDate: string;
    driverName: string;
    driverPhone: string;
    destination: string;
    routeName: string;
    teamName: string;
    startOdo: number | null;
    endOdo: number | null;
    distance: number;
    notes?: string | null;
    status: string;
  }[];
}

const SEED_VERSION = 'nalakath_v7_moveiq_oct2026';

const INITIAL_VEHICLE_INCOMES: Record<string, number> = {
  'veh-del-3057_2026-10': 52000,
  'veh-del-3443_2026-10': 56000,
  'veh-del-7384_2026-10': 64000,
  'veh-del-5839_2026-10': 58000,
  'veh-del-6587_2026-10': 54000,
  'veh-del-2266_2026-10': 48000,
  'veh-del-4474_2026-10': 50000,
  'veh-sfx-5682_2026-10': 68000,
  'veh-sfx-5801_2026-10': 62000,
  'veh-sfx-7543_2026-10': 52000,
  'veh-sfx-1524_2026-10': 49000,
};

// Runtime in-memory state (can be saved/restored from localStorage in browser)
class DataRepository {
  private profiles: Profile[] = [...INITIAL_PROFILES];
  private teams: Team[] = [...INITIAL_TEAMS];
  private routes: Route[] = [...INITIAL_ROUTES];
  private vehicles: Vehicle[] = [...INITIAL_VEHICLES];
  private drivers: Driver[] = [...INITIAL_DRIVERS];
  private assignments: Assignment[] = [...INITIAL_ASSIGNMENTS];
  private trips: Trip[] = [...INITIAL_TRIPS];
  private events: AssignmentEvent[] = [...INITIAL_EVENTS];
  private auditLogs: AuditLog[] = [...INITIAL_AUDIT_LOGS];
  private expenses: Expense[] = [...INITIAL_EXPENSES];
  private vehicleIncomes: Record<string, number> = { ...INITIAL_VEHICLE_INCOMES };
  private currentUserId: string = '00000000-0000-0000-0000-000000000001'; // Default Owner

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const storedVersion = localStorage.getItem('fleetflow_seed_version');
        if (storedVersion !== SEED_VERSION) {
          // Version bump: clear old sample data and reseed with fresh seed data
          localStorage.removeItem('fleetflow_assignments');
          localStorage.removeItem('fleetflow_trips');
          localStorage.removeItem('fleetflow_events');
          localStorage.removeItem('fleetflow_vehicles');
          localStorage.removeItem('fleetflow_drivers');
          localStorage.removeItem('fleetflow_routes');
          localStorage.removeItem('fleetflow_teams');
          localStorage.removeItem('fleetflow_expenses');
          localStorage.removeItem('fleetflow_incomes');
          localStorage.setItem('fleetflow_seed_version', SEED_VERSION);

          this.profiles = [...INITIAL_PROFILES];
          this.teams = [...INITIAL_TEAMS];
          this.routes = [...INITIAL_ROUTES];
          this.vehicles = [...INITIAL_VEHICLES];
          this.drivers = [...INITIAL_DRIVERS];
          this.assignments = [...INITIAL_ASSIGNMENTS];
          this.trips = [...INITIAL_TRIPS];
          this.events = [...INITIAL_EVENTS];
          this.auditLogs = [...INITIAL_AUDIT_LOGS];
          this.expenses = [...INITIAL_EXPENSES];
          this.vehicleIncomes = { ...INITIAL_VEHICLE_INCOMES };
        } else {
          const savedUser = localStorage.getItem('fleetflow_current_user_id');
          if (savedUser) {
            this.currentUserId = savedUser;
          }
          const savedAssignments = localStorage.getItem('fleetflow_assignments');
          if (savedAssignments) {
            this.assignments = JSON.parse(savedAssignments);
          }
          const savedTrips = localStorage.getItem('fleetflow_trips');
          if (savedTrips) {
            this.trips = JSON.parse(savedTrips);
          }
          const savedEvents = localStorage.getItem('fleetflow_events');
          if (savedEvents) {
            this.events = JSON.parse(savedEvents);
          }
          const savedVehicles = localStorage.getItem('fleetflow_vehicles');
          if (savedVehicles) {
            this.vehicles = JSON.parse(savedVehicles);
          }
          const savedDrivers = localStorage.getItem('fleetflow_drivers');
          if (savedDrivers) {
            this.drivers = JSON.parse(savedDrivers);
          }
          const savedRoutes = localStorage.getItem('fleetflow_routes');
          if (savedRoutes) {
            this.routes = JSON.parse(savedRoutes);
          }
          const savedTeams = localStorage.getItem('fleetflow_teams');
          if (savedTeams) {
            this.teams = JSON.parse(savedTeams);
          }
          const savedExpenses = localStorage.getItem('fleetflow_expenses');
          if (savedExpenses) {
            this.expenses = JSON.parse(savedExpenses);
          }
          const savedIncomes = localStorage.getItem('fleetflow_incomes');
          if (savedIncomes) {
            this.vehicleIncomes = JSON.parse(savedIncomes);
          }
        }
      } catch (err) {
        console.warn('Failed to load local storage state:', err);
      }

      // Ensure today has seeded assignments if none exist in localStorage
      const todayStr = getTodayDateString();
      const hasToday = this.assignments.some((a) => a.duty_date === todayStr);
      if (!hasToday && this.assignments.length > 0) {
        this.assignments = this.assignments.map((a, idx) => {
          if (idx < 4) {
            return { ...a, duty_date: todayStr };
          }
          return a;
        });
        this.persist();
      }
    }
  }

  private persist() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('fleetflow_current_user_id', this.currentUserId);
        localStorage.setItem('fleetflow_assignments', JSON.stringify(this.assignments));
        localStorage.setItem('fleetflow_trips', JSON.stringify(this.trips));
        localStorage.setItem('fleetflow_events', JSON.stringify(this.events));
        localStorage.setItem('fleetflow_vehicles', JSON.stringify(this.vehicles));
        localStorage.setItem('fleetflow_drivers', JSON.stringify(this.drivers));
        localStorage.setItem('fleetflow_routes', JSON.stringify(this.routes));
        localStorage.setItem('fleetflow_teams', JSON.stringify(this.teams));
        localStorage.setItem('fleetflow_expenses', JSON.stringify(this.expenses));
        localStorage.setItem('fleetflow_incomes', JSON.stringify(this.vehicleIncomes));
      } catch (err) {
        console.warn('Failed to persist to local storage:', err);
      }
    }
  }


  // --- AUTH METHODS ---
  async getCurrentProfile(): Promise<Profile | null> {
    const p = this.profiles.find((x) => x.id === this.currentUserId);
    return p || this.profiles[0];
  }

  async setSessionUser(profileId: string) {
    this.currentUserId = profileId;
    this.persist();
  }

  async loginByPhone(phone: string, _token: string): Promise<Profile> {
    // Normalization
    const cleaned = phone.replace(/[\s-]/g, '');
    const found = this.profiles.find(
      (p) => p.phone.replace(/[\s-]/g, '') === cleaned
    );

    if (!found) {
      // Check if driver phone exists, if so create a profile
      const driver = this.drivers.find(
        (d) => d.phone.replace(/[\s-]/g, '') === cleaned
      );
      if (driver) {
        const newProfile: Profile = {
          id: `profile-${Date.now()}`,
          phone: driver.phone,
          full_name: driver.full_name,
          role: 'driver',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.profiles.push(newProfile);
        driver.profile_id = newProfile.id;
        this.currentUserId = newProfile.id;
        this.persist();
        return newProfile;
      }
      throw new Error(`No registered account found with phone number ${phone}. Contact fleet management.`);
    }

    if (!found.is_active) {
      throw new Error('This account has been deactivated. Please contact your fleet owner.');
    }

    this.currentUserId = found.id;
    this.persist();
    return found;
  }

  async loginDriverByPhone(phone: string): Promise<Profile> {
    let cleanPhone = (phone || '').trim().replace(/[\s-]/g, '');
    if (cleanPhone.length === 10 && !cleanPhone.startsWith('+')) {
      cleanPhone = `+91${cleanPhone}`;
    }
    const last10 = cleanPhone.slice(-10);
    if (!last10 || last10.length < 10) {
      throw new Error('Please enter a valid 10-digit mobile number');
    }

    const matchedDriver = this.drivers.find((d) => {
      const dClean = d.phone.replace(/[\s-]/g, '');
      return dClean.slice(-10) === last10;
    });

    if (!matchedDriver) {
      throw new Error(
        `Mobile number (${cleanPhone}) is not registered by owner. Please check with your fleet administrator.`
      );
    }

    if (matchedDriver.status !== 'active') {
      throw new Error('This driver account is currently inactive. Please contact the owner.');
    }

    let profile = this.profiles.find(
      (p) =>
        (matchedDriver.profile_id && p.id === matchedDriver.profile_id) ||
        p.phone.replace(/[\s-]/g, '').slice(-10) === last10
    );

    if (!profile) {
      profile = {
        id: `profile-${matchedDriver.id}`,
        phone: matchedDriver.phone,
        full_name: matchedDriver.full_name,
        role: 'driver',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.profiles.push(profile);
    } else {
      profile.role = 'driver';
      profile.full_name = matchedDriver.full_name;
      profile.phone = matchedDriver.phone;
      profile.is_active = true;
    }

    matchedDriver.profile_id = profile.id;
    this.currentUserId = profile.id;
    this.persist();
    return profile;
  }

  async loginDriverByNameAndPhone(name: string, phone: string): Promise<Profile> {
    const cleanName = (name || '').trim();
    if (!cleanName) {
      throw new Error('Please enter driver name');
    }

    let cleanPhone = (phone || '').trim().replace(/[\s-]/g, '');
    if (cleanPhone.length === 10 && !cleanPhone.startsWith('+')) {
      cleanPhone = `+91${cleanPhone}`;
    }
    if (!cleanPhone.match(/^\+?[1-9]\d{9,14}$/)) {
      throw new Error('Please enter a valid 10-digit mobile number');
    }

    const normInputName = cleanName.toLowerCase();
    const last10InputPhone = cleanPhone.slice(-10);

    // 1. Look for registered driver matching the mobile number (last 10 digits)
    const phoneMatches = this.drivers.filter((d) => {
      const dCleanPhone = d.phone.replace(/[\s-]/g, '');
      return dCleanPhone.slice(-10) === last10InputPhone;
    });

    if (phoneMatches.length === 0) {
      // Check if driver exists with matching name but different phone
      const nameMatch = this.drivers.find((d) => {
        const dNorm = d.full_name.trim().toLowerCase();
        return (
          dNorm === normInputName ||
          dNorm.split(/\s+/)[0] === normInputName ||
          normInputName.split(/\s+/)[0] === dNorm
        );
      });
      if (nameMatch) {
        throw new Error(
          `Mobile number (${cleanPhone}) does not match registered phone for ${nameMatch.full_name}.`
        );
      }
      throw new Error(
        `Driver credentials not found in owner registry. Please enter registered name and mobile number.`
      );
    }

    // 2. Validate that the provided name matches one of the drivers with this phone
    const matchedDriver = phoneMatches.find((d) => {
      const dNorm = d.full_name.trim().toLowerCase();
      const dParts = dNorm.split(/\s+/);
      const inputParts = normInputName.split(/\s+/);
      return (
        dNorm === normInputName ||
        dParts[0] === normInputName ||
        inputParts[0] === dParts[0] ||
        normInputName.includes(dNorm) ||
        dNorm.includes(normInputName)
      );
    });

    if (!matchedDriver) {
      throw new Error(
        `Driver name (${cleanName}) does not match registered driver name for this phone number (${phoneMatches[0].full_name}).`
      );
    }

    if (matchedDriver.status !== 'active') {
      throw new Error('This driver account is currently inactive. Please contact the owner.');
    }

    // Find or create profile linked to this driver
    let profile = this.profiles.find(
      (p) =>
        (matchedDriver.profile_id && p.id === matchedDriver.profile_id) ||
        p.phone.replace(/[\s-]/g, '').slice(-10) === last10InputPhone
    );

    if (!profile) {
      profile = {
        id: `profile-${matchedDriver.id}`,
        phone: matchedDriver.phone,
        full_name: matchedDriver.full_name,
        role: 'driver',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.profiles.push(profile);
    } else {
      profile.role = 'driver';
      profile.full_name = matchedDriver.full_name;
      profile.phone = matchedDriver.phone;
      profile.is_active = true;
    }

    matchedDriver.profile_id = profile.id;
    this.currentUserId = profile.id;
    this.persist();
    return profile;
  }

  async logout() {
    this.currentUserId = '';
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fleetflow_current_user_id');
    }
  }

  // --- DASHBOARD METRICS ---
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const today = getTodayDateString();
    const todayAssignments = this.assignments.filter((a) => a.duty_date === today);

    const activeVehicles = this.vehicles.filter((v) => v.status === 'active').length;
    const maintenanceVehicles = this.vehicles.filter((v) => v.status === 'maintenance').length;
    const activeDrivers = this.drivers.filter((d) => d.status === 'active').length;

    const pendingConfirmations = todayAssignments.filter(
      (a) => a.status === 'scheduled' && a.driver_confirmed_at === null
    ).length;

    const activeTrips = this.trips.filter((t) => t.status === 'in_progress').length;
    const completedTrips = this.trips.filter((t) => t.status === 'completed').length;
    const cancelledDuties = todayAssignments.filter((a) => a.status === 'cancelled').length;

    return {
      totalVehicles: this.vehicles.length,
      activeVehicles,
      maintenanceVehicles,
      totalDrivers: this.drivers.length,
      activeDrivers,
      todayAssignmentsCount: todayAssignments.length,
      pendingConfirmationsCount: pendingConfirmations,
      activeTripsCount: activeTrips,
      completedTripsCount: completedTrips,
      cancelledDutiesCount: cancelledDuties,
    };
  }

  // --- ASSIGNMENTS ---
  async getAssignmentsWithDetails(dutyDate?: string): Promise<AssignmentWithDetails[]> {
    let list = this.assignments;
    if (dutyDate) {
      list = list.filter((a) => a.duty_date === dutyDate);
    }

    const driversMap = new Map(this.drivers.map((d) => [d.id, d]));
    const vehiclesMap = new Map(this.vehicles.map((v) => [v.id, v]));
    const routesMap = new Map(this.routes.map((r) => [r.id, r]));
    const teamsMap = new Map(this.teams.map((t) => [t.id, t]));

    return list.map((a) => {
      const driver = driversMap.get(a.driver_id) || {
        id: a.driver_id,
        employee_code: 'UNKNOWN',
        full_name: 'Unknown Driver',
        phone: '',
        license_number: '',
        license_expiry: '',
        is_fixed_route: false,
        default_route_id: null,
        status: 'active' as const,
        notes: null,
        profile_id: null,
        created_at: '',
        updated_at: '',
      };

      const vehicle = vehiclesMap.get(a.vehicle_id) || {
        id: a.vehicle_id,
        registration_number: 'UNKNOWN',
        make_model: 'Unknown Vehicle',
        vehicle_type: 'bus' as const,
        capacity: 0,
        current_odometer: 0,
        status: 'active' as const,
        notes: null,
        created_at: '',
        updated_at: '',
      };

      const trips = this.trips
        .filter((t) => t.assignment_id === a.id)
        .sort((t1, t2) => t1.trip_number - t2.trip_number);

      const events = this.events
        .filter((e) => e.assignment_id === a.id)
        .sort((e1, e2) => new Date(e2.created_at).getTime() - new Date(e1.created_at).getTime());

      return {
        ...a,
        driver,
        vehicle,
        route: a.route_id ? routesMap.get(a.route_id) : null,
        team: a.team_id ? teamsMap.get(a.team_id) : null,
        trips,
        events,
      };
    });
  }

  async getAssignmentById(id: string): Promise<AssignmentWithDetails | null> {
    const list = await this.getAssignmentsWithDetails();
    return list.find((a) => a.id === id) || null;
  }

  async createAssignment(data: {
    duty_date: string;
    driver_id: string;
    vehicle_id: string;
    route_id?: string | null;
    team_id?: string | null;
    planned_start_time: string;
    planned_end_time: string;
    notes?: string | null;
  }): Promise<Assignment> {
    const driversMap = new Map(this.drivers.map((d) => [d.id, d]));
    const vehiclesMap = new Map(this.vehicles.map((v) => [v.id, v]));

    // Check conflicts
    const conflict = checkScheduleConflicts(
      {
        dutyDate: data.duty_date,
        startTime: data.planned_start_time,
        endTime: data.planned_end_time,
        driverId: data.driver_id,
        vehicleId: data.vehicle_id,
      },
      this.assignments,
      driversMap,
      vehiclesMap
    );

    if (conflict.hasConflict) {
      throw new Error(conflict.message || 'Schedule conflict detected');
    }

    const newAssignment: Assignment = {
      id: `assign-${Date.now()}`,
      duty_date: data.duty_date,
      driver_id: data.driver_id,
      vehicle_id: data.vehicle_id,
      route_id: data.route_id || null,
      team_id: data.team_id || null,
      planned_start_time: data.planned_start_time,
      planned_end_time: data.planned_end_time,
      status: 'scheduled',
      driver_confirmed_at: null,
      notes: data.notes || null,
      created_by: this.currentUserId,
      updated_by: this.currentUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.assignments.unshift(newAssignment);

    // Record creation event
    this.events.unshift({
      id: `evt-${Date.now()}`,
      assignment_id: newAssignment.id,
      event_type: 'created',
      performed_by: this.currentUserId,
      previous_driver_id: null,
      new_driver_id: newAssignment.driver_id,
      previous_vehicle_id: null,
      new_vehicle_id: newAssignment.vehicle_id,
      reason: 'Assignment duty created by fleet dispatcher',
      metadata: { duty_date: newAssignment.duty_date },
      created_at: new Date().toISOString(),
    });

    this.persist();
    return newAssignment;
  }

  async reassignAssignment(params: {
    assignmentId: string;
    newDriverId?: string;
    newVehicleId?: string;
    reason: string;
  }): Promise<Assignment> {
    const assign = this.assignments.find((a) => a.id === params.assignmentId);
    if (!assign) throw new Error('Assignment not found');
    if (assign.status === 'completed' || assign.status === 'cancelled') {
      throw new Error(`Cannot reassign an assignment with status: ${assign.status}`);
    }

    const driversMap = new Map(this.drivers.map((d) => [d.id, d]));
    const vehiclesMap = new Map(this.vehicles.map((v) => [v.id, v]));

    const targetDriverId = params.newDriverId || assign.driver_id;
    const targetVehicleId = params.newVehicleId || assign.vehicle_id;

    // Check conflicts for the updated driver/vehicle
    const conflict = checkScheduleConflicts(
      {
        assignmentId: assign.id,
        dutyDate: assign.duty_date,
        startTime: assign.planned_start_time,
        endTime: assign.planned_end_time,
        driverId: targetDriverId,
        vehicleId: targetVehicleId,
      },
      this.assignments,
      driversMap,
      vehiclesMap
    );

    if (conflict.hasConflict) {
      throw new Error(conflict.message || 'Schedule conflict during reassignment');
    }

    const oldDriverId = assign.driver_id;
    const oldVehicleId = assign.vehicle_id;

    assign.driver_id = targetDriverId;
    assign.vehicle_id = targetVehicleId;
    assign.status = 'scheduled'; // reset confirmation for new driver
    assign.driver_confirmed_at = null;
    assign.updated_by = this.currentUserId;
    assign.updated_at = new Date().toISOString();

    // Log reassignment event
    this.events.unshift({
      id: `evt-${Date.now()}`,
      assignment_id: assign.id,
      event_type: 'reassigned',
      performed_by: this.currentUserId,
      previous_driver_id: oldDriverId,
      new_driver_id: targetDriverId,
      previous_vehicle_id: oldVehicleId,
      new_vehicle_id: targetVehicleId,
      reason: params.reason,
      metadata: {},
      created_at: new Date().toISOString(),
    });

    this.persist();
    return assign;
  }

  async updateAssignment(
    id: string,
    updates: Partial<{
      duty_date: string;
      driver_id: string;
      vehicle_id: string;
      route_id: string | null;
      team_id: string | null;
      planned_start_time: string;
      planned_end_time: string;
      status: AssignmentStatus;
      notes: string | null;
    }>
  ): Promise<Assignment> {
    const assign = this.assignments.find((a) => a.id === id);
    if (!assign) throw new Error('Assignment not found');

    const nextDutyDate = updates.duty_date ?? assign.duty_date;
    const nextStartTime = updates.planned_start_time ?? assign.planned_start_time;
    const nextEndTime = updates.planned_end_time ?? assign.planned_end_time;
    const nextDriverId = updates.driver_id ?? assign.driver_id;
    const nextVehicleId = updates.vehicle_id ?? assign.vehicle_id;

    // Check conflicts if schedule date/times, driver, or vehicle changed
    if (
      nextDutyDate !== assign.duty_date ||
      nextStartTime !== assign.planned_start_time ||
      nextEndTime !== assign.planned_end_time ||
      nextDriverId !== assign.driver_id ||
      nextVehicleId !== assign.vehicle_id
    ) {
      const driversMap = new Map(this.drivers.map((d) => [d.id, d]));
      const vehiclesMap = new Map(this.vehicles.map((v) => [v.id, v]));

      const conflict = checkScheduleConflicts(
        {
          assignmentId: assign.id,
          dutyDate: nextDutyDate,
          startTime: nextStartTime,
          endTime: nextEndTime,
          driverId: nextDriverId,
          vehicleId: nextVehicleId,
        },
        this.assignments,
        driversMap,
        vehiclesMap
      );

      if (conflict.hasConflict) {
        throw new Error(conflict.message || 'Schedule conflict detected during edit');
      }
    }

    Object.assign(assign, updates, {
      updated_by: this.currentUserId,
      updated_at: new Date().toISOString(),
    });

    this.events.unshift({
      id: `evt-${Date.now()}`,
      assignment_id: assign.id,
      event_type: 'edited',
      performed_by: this.currentUserId,
      previous_driver_id: null,
      new_driver_id: assign.driver_id,
      previous_vehicle_id: null,
      new_vehicle_id: assign.vehicle_id,
      reason: 'Assignment parameters modified by management',
      metadata: { updates },
      created_at: new Date().toISOString(),
    });

    this.persist();
    return assign;
  }

  async confirmDuty(assignmentId: string): Promise<Assignment> {
    const assign = this.assignments.find((a) => a.id === assignmentId);
    if (!assign) throw new Error('Assignment not found');
    if (assign.status !== 'scheduled') {
      if (!assign.driver_confirmed_at) {
        assign.driver_confirmed_at = new Date().toISOString();
        this.persist();
      }
      return assign;
    }

    assign.status = 'confirmed';
    assign.driver_confirmed_at = new Date().toISOString();
    assign.updated_at = new Date().toISOString();

    this.events.unshift({
      id: `evt-${Date.now()}`,
      assignment_id: assign.id,
      event_type: 'confirmed',
      performed_by: this.currentUserId,
      previous_driver_id: null,
      new_driver_id: assign.driver_id,
      previous_vehicle_id: null,
      new_vehicle_id: assign.vehicle_id,
      reason: 'Driver confirmed duty assignment',
      metadata: {},
      created_at: new Date().toISOString(),
    });

    this.persist();
    return assign;
  }

  async startTrip(params: {
    assignmentId: string;
    startOdometer: number;
    actualDestination?: string | null;
    notes?: string | null;
    startLocation?: TripLocation | null;
  }): Promise<Trip> {
    const assign = this.assignments.find((a) => a.id === params.assignmentId);
    if (!assign) throw new Error('Assignment not found');
    if (assign.status === 'cancelled') {
      throw new Error(`Cannot start trip on an assignment that is cancelled`);
    }

    if (params.startOdometer < 0) {
      throw new Error('Start odometer reading cannot be negative');
    }

    // Determine next trip number
    const existingTrips = this.trips.filter((t) => t.assignment_id === assign.id);
    const nextTripNumber = existingTrips.length + 1;

    const newTrip: Trip = {
      id: `trip-${Date.now()}`,
      assignment_id: assign.id,
      trip_number: nextTripNumber,
      status: 'in_progress',
      start_time: new Date().toISOString(),
      end_time: null,
      start_odometer: params.startOdometer,
      end_odometer: null,
      assigned_route_id: assign.route_id,
      actual_destination: params.actualDestination || null,
      driver_notes: params.notes || null,
      start_location: params.startLocation || null,
      end_location: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.trips.push(newTrip);

    // Reopen assignment if completed or mark in_progress
    assign.status = 'in_progress';
    assign.updated_at = new Date().toISOString();

    // Sync vehicle's current odometer and set active
    const vehicle = this.vehicles.find((v) => v.id === assign.vehicle_id);
    if (vehicle) {
      if (params.startOdometer > vehicle.current_odometer) {
        vehicle.current_odometer = params.startOdometer;
      }
      vehicle.status = 'active';
      vehicle.updated_at = new Date().toISOString();
    }

    this.events.unshift({
      id: `evt-${Date.now()}`,
      assignment_id: assign.id,
      event_type: 'started',
      performed_by: this.currentUserId,
      previous_driver_id: null,
      new_driver_id: assign.driver_id,
      previous_vehicle_id: null,
      new_vehicle_id: assign.vehicle_id,
      reason: `Trip #${nextTripNumber} started (Odometer: ${params.startOdometer})`,
      metadata: { trip_number: nextTripNumber, start_odometer: params.startOdometer },
      created_at: new Date().toISOString(),
    });

    this.persist();
    return newTrip;
  }

  async startTripForDriver(params: {
    driverPhoneOrId: string;
    vehicleId: string;
    startOdometer: number;
    destination?: string | null;
    notes?: string | null;
    startLocation?: TripLocation | null;
  }): Promise<Trip> {
    const driver = this.drivers.find(
      (d) =>
        d.id === params.driverPhoneOrId ||
        d.phone.replace(/[\s-]/g, '') === params.driverPhoneOrId.replace(/[\s-]/g, '') ||
        d.profile_id === params.driverPhoneOrId
    );
    if (!driver) throw new Error('Driver not found');

    const vehicle = this.vehicles.find((v) => v.id === params.vehicleId);
    if (!vehicle) throw new Error('Vehicle not found');

    const todayStr = getTodayDateString();

    // Find today's assignment for this driver and vehicle
    let assign = this.assignments.find(
      (a) => a.driver_id === driver.id && a.duty_date === todayStr && a.status !== 'cancelled'
    );

    if (!assign) {
      const team =
        this.teams.find((t) =>
          t.name.toLowerCase().includes((vehicle.company || '').toLowerCase())
        ) || this.teams[0];
      const route = this.routes.find((r) => r.team_id === team?.id) || this.routes[0];

      assign = {
        id: `assign-${Date.now()}`,
        duty_date: todayStr,
        driver_id: driver.id,
        vehicle_id: vehicle.id,
        route_id: route?.id || null,
        team_id: team?.id || null,
        planned_start_time: '08:00',
        planned_end_time: '17:00',
        status: 'in_progress',
        driver_confirmed_at: new Date().toISOString(),
        notes: params.destination || vehicle.route_location || 'Daily Duty Corridor',
        created_by: driver.profile_id || this.currentUserId,
        updated_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.assignments.unshift(assign);
    } else {
      assign.vehicle_id = vehicle.id;
      assign.status = 'in_progress';
      assign.driver_confirmed_at = assign.driver_confirmed_at || new Date().toISOString();
      if (params.destination) {
        assign.notes = params.destination;
      }
      assign.updated_at = new Date().toISOString();
    }

    return this.startTrip({
      assignmentId: assign.id,
      startOdometer: params.startOdometer,
      actualDestination: params.destination,
      notes: params.notes,
      startLocation: params.startLocation,
    });
  }

  async recordMaintenance(params: {
    vehicle_id: string;
    driver_id?: string | null;
    amount: number;
    issue_type: string;
    workshop_name?: string | null;
    date?: string;
    bill_photo_url?: string | null;
    set_vehicle_maintenance_status?: boolean;
  }): Promise<Expense> {
    const vehicle = this.vehicles.find((v) => v.id === params.vehicle_id);
    if (!vehicle) throw new Error('Vehicle not found');

    const driverId =
      params.driver_id ||
      vehicle.default_driver_ids?.[0] ||
      this.drivers[0]?.id ||
      'drv-refnise';

    const noteDetails = [
      params.issue_type,
      params.workshop_name ? `Garage: ${params.workshop_name}` : null,
    ]
      .filter(Boolean)
      .join(' — ');

    const newExpense = await this.createExpense({
      vehicle_id: vehicle.id,
      driver_id: driverId,
      expense_type: 'Maintenance',
      amount: Number(params.amount) || 0,
      date: params.date || getTodayDateString(),
      note: noteDetails || 'Vehicle maintenance & repair',
      bill_photo_url: params.bill_photo_url || null,
    });

    if (params.set_vehicle_maintenance_status) {
      vehicle.status = 'maintenance';
      vehicle.updated_at = new Date().toISOString();
    }

    this.persist();
    return newExpense;
  }

  async completeTrip(params: {
    tripId: string;
    endOdometer: number;
    notes?: string | null;
    isFinalTripOfDuty?: boolean;
    endLocation?: TripLocation | null;
    expenses?: Array<{
      expense_type: ExpenseType;
      amount: number;
      litres?: number | null;
      note?: string | null;
      bill_photo_url?: string | null;
    }>;
  }): Promise<{ trip: Trip; distanceKm: number }> {
    const trip = this.trips.find((t) => t.id === params.tripId);
    if (!trip) throw new Error('Trip not found');
    if (trip.status !== 'in_progress') {
      throw new Error(`Trip is not in progress (status: ${trip.status})`);
    }

    if (trip.start_odometer !== null && params.endOdometer < trip.start_odometer) {
      throw new Error(
        `End odometer (${params.endOdometer}) cannot be less than start odometer (${trip.start_odometer})`
      );
    }

    const distResult = calculateTripDistance(trip.start_odometer, params.endOdometer);
    const distanceKm = distResult.distanceKm || 0;

    trip.status = 'completed';
    trip.end_time = new Date().toISOString();
    trip.end_odometer = params.endOdometer;
    if (params.endLocation !== undefined) {
      trip.end_location = params.endLocation || null;
    }
    if (params.notes) {
      trip.driver_notes = trip.driver_notes
        ? `${trip.driver_notes}\n${params.notes}`
        : params.notes;
    }
    trip.updated_at = new Date().toISOString();

    // Update vehicle odometer and clear expenses
    const assign = this.assignments.find((a) => a.id === trip.assignment_id);
    if (assign) {
      const vehicle = this.vehicles.find((v) => v.id === assign.vehicle_id);
      if (vehicle) {
        vehicle.current_odometer = Math.max(vehicle.current_odometer, params.endOdometer);
        vehicle.updated_at = new Date().toISOString();
      }

      // Record any expenses entered before ending trip
      if (params.expenses && params.expenses.length > 0) {
        const todayStr = getTodayDateString();
        for (const exp of params.expenses) {
          if (exp.amount > 0) {
            this.expenses.unshift({
              id: `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              vehicle_id: assign.vehicle_id,
              driver_id: assign.driver_id,
              expense_type: exp.expense_type,
              amount: Number(exp.amount),
              litres: exp.litres || null,
              date: todayStr,
              note: exp.note || `Trip #${trip.trip_number} Expense`,
              bill_photo_url: exp.bill_photo_url || null,
              created_at: new Date().toISOString(),
            });
          }
        }
      }

      const activeTripsForDuty = this.trips.filter(
        (t) => t.assignment_id === assign.id && t.status === 'in_progress'
      );

      if (params.isFinalTripOfDuty !== false && activeTripsForDuty.length === 0) {
        assign.status = 'completed';
        assign.updated_at = new Date().toISOString();
      }

      this.events.unshift({
        id: `evt-${Date.now()}`,
        assignment_id: assign.id,
        event_type: 'completed',
        performed_by: this.currentUserId,
        previous_driver_id: null,
        new_driver_id: assign.driver_id,
        previous_vehicle_id: null,
        new_vehicle_id: assign.vehicle_id,
        reason: `Trip #${trip.trip_number} completed (${distanceKm} km)`,
        metadata: {
          trip_number: trip.trip_number,
          end_odometer: params.endOdometer,
          distance_km: distanceKm,
        },
        created_at: new Date().toISOString(),
      });
    }

    this.persist();
    return { trip, distanceKm };
  }

  // --- DRIVER PORTAL QUERIES ---
  async getDriverAssignments(driverIdOrPhone: string): Promise<AssignmentWithDetails[]> {
    // Find driver matching phone or id
    const driver = this.drivers.find(
      (d) =>
        d.id === driverIdOrPhone ||
        d.phone.replace(/[\s-]/g, '') === driverIdOrPhone.replace(/[\s-]/g, '') ||
        d.profile_id === driverIdOrPhone
    );

    if (!driver) return [];

    const todayStr = getTodayDateString();
    const todayAssigns = this.assignments.filter(
      (a) => a.driver_id === driver.id && a.duty_date === todayStr && a.status !== 'cancelled'
    );

    // If driver has no assignment for today, auto-prepare their assignment if they have a default vehicle
    if (todayAssigns.length === 0 && driver.is_fixed_route) {
      const fixedVehicle = this.vehicles.find(
        (v) =>
          v.default_driver_ids?.includes(driver.id) ||
          (v.default_driver_names || []).some(
            (n) => n.toLowerCase() === driver.full_name.toLowerCase()
          )
      );
      if (fixedVehicle) {
        const defaultRoute =
          this.routes.find((r) => r.id === driver.default_route_id) || this.routes[0];
        const team =
          this.teams.find((t) =>
            t.name.toLowerCase().includes((fixedVehicle.company || '').toLowerCase())
          ) || this.teams[0];

        const autoDuty: Assignment = {
          id: `assign-auto-${Date.now()}`,
          duty_date: todayStr,
          driver_id: driver.id,
          vehicle_id: fixedVehicle.id,
          route_id: defaultRoute?.id || null,
          team_id: team?.id || null,
          planned_start_time: '08:00',
          planned_end_time: '17:00',
          status: 'confirmed',
          driver_confirmed_at: new Date().toISOString(),
          notes: fixedVehicle.route_location || 'Fixed Route Scheduled Duty',
          created_by: driver.profile_id || this.currentUserId,
          updated_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.assignments.unshift(autoDuty);
        this.persist();
      }
    }

    const all = await this.getAssignmentsWithDetails();
    return all.filter((a) => a.driver_id === driver.id);
  }

  // --- FLEET MASTER DATA ---
  async getVehicles(company?: string): Promise<Vehicle[]> {
    if (!company || company === 'all' || company === 'All') {
      return [...this.vehicles];
    }
    return this.vehicles.filter(
      (v) => (v.company || '').toLowerCase() === company.toLowerCase()
    );
  }


  async createVehicle(data: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>): Promise<Vehicle> {
    const existing = this.vehicles.find(
      (v) => v.registration_number.toUpperCase() === data.registration_number.toUpperCase()
    );
    if (existing) {
      throw new Error(`Vehicle with registration ${data.registration_number} already exists.`);
    }

    const newVehicle: Vehicle = {
      ...data,
      id: `veh-${Date.now()}`,
      registration_number: data.registration_number.toUpperCase(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.vehicles.push(newVehicle);
    this.persist();
    return newVehicle;
  }

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    const v = this.vehicles.find((x) => x.id === id);
    if (!v) throw new Error('Vehicle not found');
    Object.assign(v, updates, { updated_at: new Date().toISOString() });
    this.persist();
    return v;
  }

  async getDrivers(): Promise<Driver[]> {
    return [...this.drivers];
  }

  async createDriver(data: {
    full_name: string;
    phone: string;
    employee_code?: string;
    license_number?: string;
    license_expiry?: string;
    is_fixed_route?: boolean;
    default_route_id?: string | null;
    status?: import('@/types/database').DriverStatus;
    notes?: string | null;
  }): Promise<Driver> {
    const cleanPhone = data.phone.trim();
    const existingPhone = this.drivers.find(
      (d) => d.phone.replace(/[\s-]/g, '') === cleanPhone.replace(/[\s-]/g, '')
    );
    if (existingPhone) {
      throw new Error(`Driver with mobile number ${cleanPhone} is already registered.`);
    }

    // Auto-generate employee code if not provided
    let code = (data.employee_code || '').trim().toUpperCase();
    if (!code) {
      code = `DRV-${1000 + this.drivers.length + 1}`;
      while (this.drivers.some((d) => d.employee_code.toUpperCase() === code)) {
        code = `DRV-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    } else {
      const existingCode = this.drivers.find(
        (d) => d.employee_code.toUpperCase() === code
      );
      if (existingCode) {
        throw new Error(`Driver with employee code ${code} already exists.`);
      }
    }

    const newDriver: Driver = {
      id: `drv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      profile_id: null,
      employee_code: code,
      full_name: data.full_name.trim(),
      phone: cleanPhone,
      license_number: data.license_number?.trim() || `DL-${cleanPhone.replace(/\D/g, '').slice(-6) || 'NA'}`,
      license_expiry: data.license_expiry || '2035-12-31',
      is_fixed_route: data.is_fixed_route ?? false,
      default_route_id: data.default_route_id || null,
      status: data.status || 'active',
      notes: data.notes?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Auto-create user profile so driver can log in immediately
    const existingProfile = this.profiles.find(
      (p) => p.phone.replace(/[\s-]/g, '') === cleanPhone.replace(/[\s-]/g, '')
    );
    if (!existingProfile) {
      const newProfile: Profile = {
        id: `profile-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: cleanPhone,
        full_name: data.full_name.trim(),
        role: 'driver',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.profiles.push(newProfile);
      newDriver.profile_id = newProfile.id;
    } else {
      newDriver.profile_id = existingProfile.id;
    }

    this.drivers.push(newDriver);
    this.persist();
    return newDriver;
  }

  async deleteDriver(id: string): Promise<void> {
    const idx = this.drivers.findIndex((d) => d.id === id);
    if (idx !== -1) {
      const d = this.drivers[idx];
      this.drivers.splice(idx, 1);
      this.profiles = this.profiles.filter((p) => p.phone !== d.phone);
      this.persist();
    }
  }

  async getVehicleTodayStatus(searchQuery: string) {
    const q = searchQuery.trim().toLowerCase();
    const today = getTodayDateString();

    const vehicle = this.vehicles.find(
      (v) =>
        v.registration_number.toLowerCase().includes(q) ||
        v.id.toLowerCase() === q
    );

    if (!vehicle) return null;

    const assignment = this.assignments.find(
      (a) => a.vehicle_id === vehicle.id && a.duty_date === today
    );

    let driver: Driver | null = null;
    let route: Route | null = null;
    let trips: Trip[] = [];
    let activeTrip: Trip | null = null;

    if (assignment) {
      driver = this.drivers.find((d) => d.id === assignment.driver_id) || null;
      route = this.routes.find((r) => r.id === assignment.route_id) || null;
      trips = this.trips.filter((t) => t.assignment_id === assignment.id);
      activeTrip = trips.find((t) => t.status === 'in_progress') || null;
    }

    return {
      vehicle,
      assignment: assignment || null,
      driver,
      route,
      trips,
      activeTrip,
      hasDutyToday: !!assignment,
    };
  }

  async getAllTrips(): Promise<Trip[]> {
    return [...this.trips];
  }

  // --- MONTH-END DRIVER VEHICLE & KM CALCULATOR ---
  async getDriverMonthlySummary(
    driverIdOrPhone: string,
    monthPrefix?: string
  ): Promise<DriverMonthlySummary | null> {
    const cleaned = driverIdOrPhone.replace(/[\s-]/g, '').toLowerCase();
    const driver = this.drivers.find(
      (d) =>
        d.id === driverIdOrPhone ||
        d.phone.replace(/[\s-]/g, '').toLowerCase() === cleaned ||
        d.full_name.toLowerCase().includes(cleaned)
    );

    if (!driver) return null;

    // Filter assignments for this driver
    const driverAssignments = this.assignments.filter((a) => {
      if (a.driver_id !== driver.id) return false;
      if (monthPrefix && !a.duty_date.startsWith(monthPrefix)) return false;
      return true;
    });

    const assignmentIds = new Set(driverAssignments.map((a) => a.id));
    const assignmentsMap = new Map(driverAssignments.map((a) => [a.id, a]));
    const vehiclesMap = new Map(this.vehicles.map((v) => [v.id, v]));
    const routesMap = new Map(this.routes.map((r) => [r.id, r]));

    // All trips belonging to this driver's assignments
    const driverTrips = this.trips.filter((t) => assignmentIds.has(t.assignment_id));

    // Vehicle breakdown tracking
    const vehicleStats = new Map<string, { vehicle: Vehicle; tripsCount: number; totalKm: number }>();
    const distinctDates = new Set<string>();
    let totalKilometers = 0;

    const tripDetails: DriverMonthlySummary['tripDetails'] = [];

    for (const trip of driverTrips) {
      const assignment = assignmentsMap.get(trip.assignment_id)!;
      distinctDates.add(assignment.duty_date);

      const vehicle = vehiclesMap.get(assignment.vehicle_id);
      const route = assignment.route_id ? routesMap.get(assignment.route_id) : null;

      const dist =
        trip.end_odometer !== null &&
        trip.end_odometer !== undefined &&
        trip.start_odometer !== null &&
        trip.start_odometer !== undefined
          ? Math.max(0, trip.end_odometer - trip.start_odometer)
          : 0;

      totalKilometers += dist;

      if (vehicle) {
        if (!vehicleStats.has(vehicle.id)) {
          vehicleStats.set(vehicle.id, {
            vehicle,
            tripsCount: 0,
            totalKm: 0,
          });
        }
        const stat = vehicleStats.get(vehicle.id)!;
        stat.tripsCount += 1;
        stat.totalKm += dist;
      }

      tripDetails.push({
        tripId: trip.id,
        dutyDate: assignment.duty_date,
        vehicleRegistration: vehicle?.registration_number || 'Unknown',
        vehicleModel: vehicle?.make_model || '',
        destination: trip.actual_destination || route?.name || 'Local Route',
        routeName: route ? `${route.code} (${route.name})` : 'Special Dispatch',
        startOdo: trip.start_odometer,
        endOdo: trip.end_odometer,
        distance: dist,
        notes: trip.driver_notes || assignment.notes,
        status: trip.status,
      });
    }

    // Sort newest date first
    tripDetails.sort((a, b) => b.dutyDate.localeCompare(a.dutyDate));

    return {
      driver,
      month: monthPrefix || 'All Time',
      totalKilometers: Math.round(totalKilometers * 10) / 10,
      totalDaysWorked: distinctDates.size,
      totalTripsCount: driverTrips.length,
      vehiclesBreakdown: Array.from(vehicleStats.values()).sort((a, b) => b.totalKm - a.totalKm),
      tripDetails,
    };
  }

  // --- VEHICLE TRAVEL & ROUTE HISTORY ---
  async getVehicleTravelHistory(vehicleQuery: string): Promise<VehicleTravelHistory | null> {
    const q = vehicleQuery.trim().toLowerCase().replace(/[\s-]/g, '');
    const vehicle = this.vehicles.find(
      (v) =>
        v.id === vehicleQuery ||
        v.registration_number.toLowerCase().replace(/[\s-]/g, '').includes(q)
    );

    if (!vehicle) return null;

    const vehicleAssignments = this.assignments.filter((a) => a.vehicle_id === vehicle.id);
    const assignmentIds = new Set(vehicleAssignments.map((a) => a.id));
    const assignmentsMap = new Map(vehicleAssignments.map((a) => [a.id, a]));
    const driversMap = new Map(this.drivers.map((d) => [d.id, d]));
    const routesMap = new Map(this.routes.map((r) => [r.id, r]));
    const teamsMap = new Map(this.teams.map((t) => [t.id, t]));

    const vehicleTrips = this.trips.filter((t) => assignmentIds.has(t.assignment_id));

    const driverStats = new Map<string, { driver: Driver; tripsCount: number; totalKm: number }>();
    let totalRecordedDistance = 0;

    const history: VehicleTravelHistory['history'] = [];

    for (const trip of vehicleTrips) {
      const assignment = assignmentsMap.get(trip.assignment_id)!;
      const driver = driversMap.get(assignment.driver_id);
      const route = assignment.route_id ? routesMap.get(assignment.route_id) : null;
      const team = assignment.team_id ? teamsMap.get(assignment.team_id) : null;

      const dist =
        trip.end_odometer !== null &&
        trip.end_odometer !== undefined &&
        trip.start_odometer !== null &&
        trip.start_odometer !== undefined
          ? Math.max(0, trip.end_odometer - trip.start_odometer)
          : 0;

      totalRecordedDistance += dist;

      if (driver) {
        if (!driverStats.has(driver.id)) {
          driverStats.set(driver.id, {
            driver,
            tripsCount: 0,
            totalKm: 0,
          });
        }
        const stat = driverStats.get(driver.id)!;
        stat.tripsCount += 1;
        stat.totalKm += dist;
      }

      history.push({
        tripId: trip.id,
        dutyDate: assignment.duty_date,
        driverName: driver?.full_name || 'Unassigned',
        driverPhone: driver?.phone || '',
        destination: trip.actual_destination || route?.name || 'Local Transit',
        routeName: route ? `${route.code} — ${route.name}` : 'Direct Transit',
        teamName: team?.name || 'General Operations',
        startOdo: trip.start_odometer,
        endOdo: trip.end_odometer,
        distance: dist,
        notes: trip.driver_notes || assignment.notes,
        status: trip.status,
      });
    }

    // Sort newest date first
    history.sort((a, b) => b.dutyDate.localeCompare(a.dutyDate));

    return {
      vehicle,
      totalRecordedDistance: Math.round(totalRecordedDistance * 10) / 10,
      tripsCount: vehicleTrips.length,
      uniqueDrivers: Array.from(driverStats.values()).sort((a, b) => b.totalKm - a.totalKm),
      history,
    };
  }

  async updateDriver(id: string, updates: Partial<Driver>): Promise<Driver> {
    const d = this.drivers.find((x) => x.id === id);
    if (!d) throw new Error('Driver not found');
    Object.assign(d, updates, { updated_at: new Date().toISOString() });
    this.persist();
    return d;
  }

  async getTeams(): Promise<Team[]> {
    return [...this.teams];
  }

  async createTeam(data: Omit<Team, 'id' | 'created_at' | 'updated_at'>): Promise<Team> {
    const newTeam: Team = {
      ...data,
      id: `team-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.teams.push(newTeam);
    this.persist();
    return newTeam;
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
    const t = this.teams.find((x) => x.id === id);
    if (!t) throw new Error('Team not found');
    Object.assign(t, updates, { updated_at: new Date().toISOString() });
    this.persist();
    return t;
  }

  async getRoutes(): Promise<Route[]> {
    return [...this.routes];
  }

  async createRoute(data: Omit<Route, 'id' | 'created_at' | 'updated_at'>): Promise<Route> {
    const newRoute: Route = {
      ...data,
      id: `route-${Date.now()}`,
      code: data.code.toUpperCase(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.routes.push(newRoute);
    this.persist();
    return newRoute;
  }

  async updateRoute(id: string, updates: Partial<Route>): Promise<Route> {
    const r = this.routes.find((x) => x.id === id);
    if (!r) throw new Error('Route not found');
    if (updates.code) {
      updates.code = updates.code.toUpperCase();
    }
    Object.assign(r, updates, { updated_at: new Date().toISOString() });
    this.persist();
    return r;
  }

  async getTripsWithDetails(): Promise<TripWithDetails[]> {
    const assignmentsMap = new Map(this.assignments.map((a) => [a.id, a]));
    const driversMap = new Map(this.drivers.map((d) => [d.id, d]));
    const vehiclesMap = new Map(this.vehicles.map((v) => [v.id, v]));
    const routesMap = new Map(this.routes.map((r) => [r.id, r]));
    const teamsMap = new Map(this.teams.map((t) => [t.id, t]));

    return this.trips.map((t) => {
      const a = assignmentsMap.get(t.assignment_id)!;
      const driver = driversMap.get(a?.driver_id);
      const vehicle = vehiclesMap.get(a?.vehicle_id);

      return {
        ...t,
        assignment: {
          ...a,
          driver: driver!,
          vehicle: vehicle!,
          team: a?.team_id ? teamsMap.get(a.team_id) : null,
          route: a?.route_id ? routesMap.get(a.route_id) : null,
        },
        assigned_route: t.assigned_route_id ? routesMap.get(t.assigned_route_id) : null,
      };
    });
  }

  async getAssignmentEvents(): Promise<AssignmentEvent[]> {
    return [...this.events];
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return [...this.auditLogs];
  }

  // --- VEHICLE SEARCH & VEHICLE DETAIL PAGE ---
  async searchVehicles(query: string, company?: string): Promise<Vehicle[]> {
    const q = query.trim().toLowerCase().replace(/[\s-]/g, '');
    let list = this.vehicles;
    if (company && company !== 'all' && company !== 'All') {
      list = list.filter((v) => (v.company || '').toLowerCase() === company.toLowerCase());
    }
    if (!q) return list;
    return list.filter((v) => {
      const regClean = v.registration_number.toLowerCase().replace(/[\s-]/g, '');
      const modelClean = v.make_model.toLowerCase();
      const driversClean = (v.default_driver_names || []).join(' ').toLowerCase();
      const routeClean = (v.route_location || '').toLowerCase();
      return (
        regClean.includes(q) ||
        modelClean.includes(query.trim().toLowerCase()) ||
        driversClean.includes(query.trim().toLowerCase()) ||
        routeClean.includes(query.trim().toLowerCase()) ||
        v.id === query.trim()
      );
    });
  }

  async getVehicleDetail(query: string, monthPrefix?: string): Promise<VehicleDetailReport | null> {
    const q = query.trim().toLowerCase().replace(/[\s-]/g, '');
    const vehicle = this.vehicles.find((v) => {
      const regClean = v.registration_number.toLowerCase().replace(/[\s-]/g, '');
      return v.id === query.trim() || regClean === q || regClean.includes(q);
    });

    if (!vehicle) return null;

    const targetMonth = monthPrefix || getCurrentMonthPrefix();

    // 1. All assignments for this vehicle in targetMonth
    const vehicleAssignments = this.assignments.filter(
      (a) =>
        a.vehicle_id === vehicle.id &&
        a.duty_date.startsWith(targetMonth) &&
        a.status !== 'cancelled'
    );
    const assignmentIds = new Set(vehicleAssignments.map((a) => a.id));

    // 2. All trips for these assignments
    const vehicleTrips = this.trips.filter((t) => assignmentIds.has(t.assignment_id));
    const assignmentsMap = new Map(vehicleAssignments.map((a) => [a.id, a]));
    const driversMap = new Map(this.drivers.map((d) => [d.id, d]));

    // 3. Aggregate all drivers who drove this vehicle this month
    const driverStatsMap = new Map<
      string,
      {
        driverId: string;
        driverName: string;
        driverPhone: string;
        employeeCode: string;
        dutyDates: Set<string>;
        tripsCount: number;
        totalKm: number;
      }
    >();

    for (const trip of vehicleTrips) {
      const assign = assignmentsMap.get(trip.assignment_id);
      if (!assign) continue;
      const driver = driversMap.get(assign.driver_id);
      if (!driver) continue;

      if (!driverStatsMap.has(driver.id)) {
        driverStatsMap.set(driver.id, {
          driverId: driver.id,
          driverName: driver.full_name,
          driverPhone: driver.phone,
          employeeCode: driver.employee_code,
          dutyDates: new Set<string>(),
          tripsCount: 0,
          totalKm: 0,
        });
      }

      const stat = driverStatsMap.get(driver.id)!;
      stat.dutyDates.add(assign.duty_date);
      stat.tripsCount += 1;

      const dist =
        trip.end_odometer !== null &&
        trip.start_odometer !== null &&
        trip.end_odometer !== undefined &&
        trip.start_odometer !== undefined
          ? Math.max(0, trip.end_odometer - trip.start_odometer)
          : 0;
      stat.totalKm += dist;
    }

    // Also include any assignments without trips yet
    for (const assign of vehicleAssignments) {
      const driver = driversMap.get(assign.driver_id);
      if (!driver) continue;
      if (!driverStatsMap.has(driver.id)) {
        driverStatsMap.set(driver.id, {
          driverId: driver.id,
          driverName: driver.full_name,
          driverPhone: driver.phone,
          employeeCode: driver.employee_code,
          dutyDates: new Set<string>([assign.duty_date]),
          tripsCount: 0,
          totalKm: 0,
        });
      } else {
        driverStatsMap.get(driver.id)!.dutyDates.add(assign.duty_date);
      }
    }

    const driversWhoDrove: VehicleMonthlyDriverStats[] = Array.from(driverStatsMap.values())
      .map((s) => ({
        driverId: s.driverId,
        driverName: s.driverName,
        driverPhone: s.driverPhone,
        employeeCode: s.employeeCode,
        daysCount: s.dutyDates.size,
        tripsCount: s.tripsCount,
        totalKm: Math.round(s.totalKm * 10) / 10,
        dates: Array.from(s.dutyDates).sort(),
      }))
      .sort((a, b) => b.totalKm - a.totalKm || b.daysCount - a.daysCount);

    // 4. Expenses for the vehicle for this month
    const vehicleExpenses = this.expenses
      .filter((e) => e.vehicle_id === vehicle.id && e.date.startsWith(targetMonth))
      .sort((a, b) => b.date.localeCompare(a.date));

    let fuelTotal = 0;
    let fuelLitresTotal = 0;
    let tollTotal = 0;
    let maintenanceTotal = 0;
    let otherTotal = 0;

    for (const exp of vehicleExpenses) {
      const amt = Number(exp.amount) || 0;
      if (exp.expense_type === 'Fuel') {
        fuelTotal += amt;
        fuelLitresTotal += Number(exp.litres) || 0;
      } else if (exp.expense_type === 'Toll') {
        tollTotal += amt;
      } else if (exp.expense_type === 'Maintenance') {
        maintenanceTotal += amt;
      } else {
        otherTotal += amt;
      }
    }

    const grandTotal = fuelTotal + tollTotal + maintenanceTotal + otherTotal;

    const entriesWithDetails: ExpenseWithDetails[] = vehicleExpenses.map((e) => ({
      ...e,
      vehicle,
      driver: driversMap.get(e.driver_id) || null,
    }));

    const distinctDates = new Set(vehicleAssignments.map((a) => a.duty_date));
    const totalMonthKm = driversWhoDrove.reduce((sum, d) => sum + d.totalKm, 0);

    // 5. Travel History for this vehicle in targetMonth (newest first)
    const travelHistory: VehicleTravelHistoryTrip[] = vehicleTrips
      .map((t) => {
        const assign = assignmentsMap.get(t.assignment_id);
        const driver = assign ? driversMap.get(assign.driver_id) : null;
        const dutyDate = assign?.duty_date || (t.start_time ? t.start_time.split('T')[0] : targetMonth);
        const driverName = driver?.full_name || 'Assigned Driver';
        const driverPhone = driver?.phone || '';

        const startPlace =
          t.start_location?.place_name ||
          (t.start_location
            ? `${t.start_location.latitude.toFixed(4)}, ${t.start_location.longitude.toFixed(4)}`
            : 'Location not available');

        const endPlace =
          t.end_location?.place_name ||
          (t.end_location
            ? `${t.end_location.latitude.toFixed(4)}, ${t.end_location.longitude.toFixed(4)}`
            : t.status === 'in_progress'
            ? 'Trip in progress'
            : 'Location not available');

        const startKm = t.start_odometer !== null && t.start_odometer !== undefined ? t.start_odometer : null;
        const endKm = t.end_odometer !== null && t.end_odometer !== undefined ? t.end_odometer : null;
        const distanceKm =
          startKm !== null && endKm !== null && endKm >= startKm
            ? Math.round((endKm - startKm) * 10) / 10
            : 0;

        return {
          tripId: t.id,
          dutyDate,
          driverName,
          driverPhone,
          startPlace,
          endPlace,
          startOdometer: startKm,
          endOdometer: endKm,
          distanceKm,
          startLocation: t.start_location || null,
          endLocation: t.end_location || null,
          status: t.status,
        };
      })
      .sort((a, b) => {
        // Newest first by dutyDate or tripId
        return b.dutyDate.localeCompare(a.dutyDate) || b.tripId.localeCompare(a.tripId);
      });

    const monthlyIncome = this.getVehicleMonthlyIncomeSync(vehicle.id, targetMonth);
    const profitOrLoss = monthlyIncome - grandTotal;

    return {
      vehicle,
      selectedMonth: targetMonth,
      company: vehicle.company || 'Delhivery',
      routeLocation: vehicle.route_location || 'Ad-hoc',
      defaultDrivers: (vehicle.default_driver_names || []).join(', ') || 'Unassigned',
      driversWhoDrove,
      totalDriversCount: driversWhoDrove.length,
      totalDaysOperated: distinctDates.size,
      totalTripsCount: vehicleTrips.length,
      totalMonthKm: Math.round(totalMonthKm * 10) / 10,
      monthlyIncome,
      profitOrLoss,
      travelHistory,
      expenses: {
        totals: {
          fuel: fuelTotal,
          fuelLitres: Math.round(fuelLitresTotal * 10) / 10,
          toll: tollTotal,
          maintenance: maintenanceTotal,
          other: otherTotal,
          grandTotal,
        },
        entries: entriesWithDetails,
      },
    };
  }

  // --- EXPENSE MANAGEMENT ---
  async getExpenses(filter?: {
    vehicleId?: string;
    driverId?: string;
    monthPrefix?: string;
  }): Promise<ExpenseWithDetails[]> {
    const vehiclesMap = new Map(this.vehicles.map((v) => [v.id, v]));
    const driversMap = new Map(this.drivers.map((d) => [d.id, d]));

    let list = this.expenses;

    if (filter?.vehicleId) {
      list = list.filter((e) => e.vehicle_id === filter.vehicleId);
    }
    if (filter?.driverId) {
      list = list.filter((e) => e.driver_id === filter.driverId);
    }
    if (filter?.monthPrefix) {
      list = list.filter((e) => e.date.startsWith(filter.monthPrefix!));
    }

    // Sort newest first
    const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));

    return sorted.map((e) => ({
      ...e,
      vehicle: vehiclesMap.get(e.vehicle_id) || null,
      driver: driversMap.get(e.driver_id) || null,
    }));
  }

  async createExpense(data: {
    vehicle_id: string;
    driver_id: string;
    expense_type: ExpenseType;
    amount: number;
    date?: string;
    litres?: number | null;
    note?: string | null;
    bill_photo_url?: string | null;
  }): Promise<Expense> {
    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      vehicle_id: data.vehicle_id,
      driver_id: data.driver_id,
      expense_type: data.expense_type,
      amount: Number(data.amount) || 0,
      date: data.date || getTodayDateString(),
      litres: data.expense_type === 'Fuel' ? Number(data.litres) || null : null,
      note: data.note || null,
      bill_photo_url: data.bill_photo_url || null,
      created_at: new Date().toISOString(),
    };

    this.expenses.unshift(newExpense);
    this.persist();
    return newExpense;
  }

  async getDriverExpenses(
    driverPhoneOrId: string,
    monthPrefix?: string
  ): Promise<ExpenseWithDetails[]> {
    const driver = this.drivers.find(
      (d) =>
        d.id === driverPhoneOrId ||
        d.phone.replace(/[\s-]/g, '') === driverPhoneOrId.replace(/[\s-]/g, '') ||
        d.profile_id === driverPhoneOrId
    );
    if (!driver) return [];
    return this.getExpenses({ driverId: driver.id, monthPrefix });
  }

  // --- MONTHLY VEHICLE INCOME & PROFIT/LOSS ---
  getVehicleMonthlyIncomeSync(vehicleId: string, monthPrefix?: string): number {
    const month = monthPrefix || getCurrentMonthPrefix();
    const key = `${vehicleId}_${month}`;
    if (this.vehicleIncomes[key] !== undefined) {
      return this.vehicleIncomes[key];
    }
    const v = this.vehicles.find((veh) => veh.id === vehicleId);
    if (v?.company === 'Shadowfax') return 55000;
    return 52000;
  }

  async getVehicleMonthlyIncome(vehicleId: string, monthPrefix?: string): Promise<number> {
    return this.getVehicleMonthlyIncomeSync(vehicleId, monthPrefix);
  }

  async setVehicleMonthlyIncome(
    vehicleId: string,
    monthPrefix: string,
    amount: number
  ): Promise<void> {
    const key = `${vehicleId}_${monthPrefix}`;
    this.vehicleIncomes[key] = Math.max(0, amount);
    this.persist();
  }

  // --- TRIP & EXPENSE CORRECTIONS (OWNER OVERRIDE) ---
  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    const exp = this.expenses.find((e) => e.id === id);
    if (!exp) throw new Error('Expense not found');
    Object.assign(exp, updates, { updated_at: new Date().toISOString() });
    this.persist();
    return exp;
  }

  async deleteExpense(id: string): Promise<void> {
    const idx = this.expenses.findIndex((e) => e.id === id);
    if (idx !== -1) {
      this.expenses.splice(idx, 1);
      this.persist();
    }
  }

  async updateTrip(id: string, updates: Partial<Trip>): Promise<Trip> {
    const trip = this.trips.find((t) => t.id === id);
    if (!trip) throw new Error('Trip not found');
    Object.assign(trip, updates, { updated_at: new Date().toISOString() });

    // If odometer changed, sync vehicle current odometer if needed
    if (updates.end_odometer !== undefined && updates.end_odometer !== null) {
      const assign = this.assignments.find((a) => a.id === trip.assignment_id);
      if (assign) {
        const vehicle = this.vehicles.find((v) => v.id === assign.vehicle_id);
        if (vehicle && updates.end_odometer > vehicle.current_odometer) {
          vehicle.current_odometer = updates.end_odometer;
        }
      }
    }

    this.persist();
    return trip;
  }

  async deleteTrip(id: string): Promise<void> {
    const idx = this.trips.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this.trips.splice(idx, 1);
      this.persist();
    }
  }

  // --- ARCHIVING ---
  async archiveVehicle(id: string): Promise<Vehicle> {
    return this.updateVehicle(id, { status: 'inactive' });
  }

  async archiveDriver(id: string): Promise<Driver> {
    return this.updateDriver(id, { status: 'inactive' });
  }

  // --- LIVE TRIP & VEHICLE/DRIVER STATUS ---
  getActiveTripForVehicle(vehicleId: string): {
    trip: Trip;
    driver: Driver;
    assignment: Assignment;
  } | null {
    for (const trip of this.trips) {
      if (trip.status === 'in_progress') {
        const assign = this.assignments.find((a) => a.id === trip.assignment_id);
        if (assign && assign.vehicle_id === vehicleId) {
          const driver = this.drivers.find((d) => d.id === assign.driver_id);
          if (driver) {
            return { trip, driver, assignment: assign };
          }
        }
      }
    }
    return null;
  }

  getActiveTripForDriver(driverId: string): {
    trip: Trip;
    vehicle: Vehicle;
    assignment: Assignment;
  } | null {
    for (const trip of this.trips) {
      if (trip.status === 'in_progress') {
        const assign = this.assignments.find((a) => a.id === trip.assignment_id);
        if (assign && assign.driver_id === driverId) {
          const vehicle = this.vehicles.find((v) => v.id === assign.vehicle_id);
          if (vehicle) {
            return { trip, vehicle, assignment: assign };
          }
        }
      }
    }
    return null;
  }

  async assignDriverAdhocVehicle(
    driverPhoneOrId: string,
    vehicleId: string,
    routeLocation?: string
  ): Promise<AssignmentWithDetails> {
    const driver = this.drivers.find(
      (d) =>
        d.id === driverPhoneOrId ||
        d.phone.replace(/[\s-]/g, '') === driverPhoneOrId.replace(/[\s-]/g, '') ||
        d.profile_id === driverPhoneOrId
    );
    if (!driver) throw new Error('Driver not found');

    const vehicle = this.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) throw new Error('Vehicle not found');

    const todayStr = getTodayDateString();

    let assign = this.assignments.find(
      (a) => a.driver_id === driver.id && a.duty_date === todayStr && a.status !== 'cancelled'
    );

    if (assign) {
      assign.vehicle_id = vehicle.id;
      if (routeLocation) {
        assign.notes = routeLocation;
      }
      assign.updated_at = new Date().toISOString();
    } else {
      const team =
        this.teams.find((t) =>
          t.name.toLowerCase().includes((vehicle.company || '').toLowerCase())
        ) || this.teams[0];
      const route = this.routes.find((r) => r.team_id === team?.id) || this.routes[0];

      assign = {
        id: `assign-${Date.now()}`,
        duty_date: todayStr,
        driver_id: driver.id,
        vehicle_id: vehicle.id,
        route_id: route?.id || null,
        team_id: team?.id || null,
        planned_start_time: '08:00',
        planned_end_time: '17:00',
        status: 'confirmed',
        driver_confirmed_at: new Date().toISOString(),
        notes: routeLocation || vehicle.route_location || 'Ad-hoc corridor run',
        created_by: driver.profile_id || this.currentUserId,
        updated_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.assignments.unshift(assign);
    }

    this.persist();
    const detailed = await this.getAssignmentById(assign.id);
    return detailed!;
  }

  // --- RAW DATA FOR REPORT GENERATION ---
  async getReportRawData(company?: string) {
    let vList = this.vehicles;
    if (company && company !== 'all' && company !== 'All') {
      vList = vList.filter((v) => (v.company || '').toLowerCase() === company.toLowerCase());
    }
    const vIds = new Set(vList.map((v) => v.id));
    const filteredAssignments = this.assignments.filter((a) => vIds.has(a.vehicle_id));
    const aIds = new Set(filteredAssignments.map((a) => a.id));
    const filteredTrips = this.trips.filter((t) => aIds.has(t.assignment_id));
    const filteredExpenses = this.expenses.filter((e) => vIds.has(e.vehicle_id));

    return {
      assignments: filteredAssignments,
      trips: filteredTrips,
      drivers: this.drivers,
      vehicles: vList,
      routes: this.routes,
      teams: this.teams,
      expenses: filteredExpenses,
    };
  }
}

// Global Singleton
export const dataRepo = new DataRepository();
