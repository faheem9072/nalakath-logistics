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
} from '@/types/database';
import {
  AssignmentWithDetails,
  TripWithDetails,
  DashboardMetrics,
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
  getTodayDateString,
} from './mock/mock-store';
import { checkScheduleConflicts } from './utils/conflict-detector';
import { calculateTripDistance } from './utils/odometer-calculator';

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
  private currentUserId: string = '00000000-0000-0000-0000-000000000001'; // Default Owner

  constructor() {
    if (typeof window !== 'undefined') {
      try {
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
      } catch (err) {
        console.warn('Failed to load local storage state:', err);
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
      throw new Error(`Cannot confirm duty with status ${assign.status}`);
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
  }): Promise<Trip> {
    const assign = this.assignments.find((a) => a.id === params.assignmentId);
    if (!assign) throw new Error('Assignment not found');
    if (assign.status === 'completed' || assign.status === 'cancelled') {
      throw new Error(`Cannot start trip on an assignment that is ${assign.status}`);
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.trips.push(newTrip);

    assign.status = 'in_progress';
    assign.updated_at = new Date().toISOString();

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

  async completeTrip(params: {
    tripId: string;
    endOdometer: number;
    notes?: string | null;
    isFinalTripOfDuty?: boolean;
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
    if (params.notes) {
      trip.driver_notes = trip.driver_notes
        ? `${trip.driver_notes}\n${params.notes}`
        : params.notes;
    }
    trip.updated_at = new Date().toISOString();

    // Update vehicle odometer
    const assign = this.assignments.find((a) => a.id === trip.assignment_id);
    if (assign) {
      const vehicle = this.vehicles.find((v) => v.id === assign.vehicle_id);
      if (vehicle) {
        vehicle.current_odometer = Math.max(vehicle.current_odometer, params.endOdometer);
        vehicle.updated_at = new Date().toISOString();
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

    const all = await this.getAssignmentsWithDetails();
    return all.filter((a) => a.driver_id === driver.id);
  }

  // --- FLEET MASTER DATA ---
  async getVehicles(): Promise<Vehicle[]> {
    return [...this.vehicles];
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

  async createDriver(data: Omit<Driver, 'id' | 'profile_id' | 'created_at' | 'updated_at'>): Promise<Driver> {
    const existingCode = this.drivers.find(
      (d) => d.employee_code.toUpperCase() === data.employee_code.toUpperCase()
    );
    if (existingCode) {
      throw new Error(`Driver with employee code ${data.employee_code} already exists.`);
    }

    const newDriver: Driver = {
      ...data,
      id: `drv-${Date.now()}`,
      profile_id: null,
      employee_code: data.employee_code.toUpperCase(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.drivers.push(newDriver);
    this.persist();
    return newDriver;
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

  // --- RAW DATA FOR REPORT GENERATION ---
  async getReportRawData() {
    return {
      assignments: this.assignments,
      trips: this.trips,
      drivers: this.drivers,
      vehicles: this.vehicles,
      routes: this.routes,
      teams: this.teams,
    };
  }
}

// Global Singleton
export const dataRepo = new DataRepository();
