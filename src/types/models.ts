import {
  Assignment,
  Trip,
  Driver,
  Vehicle,
  Route,
  Team,
  AssignmentEvent,
  Profile,
} from './database';

export interface AssignmentWithDetails extends Assignment {
  driver: Driver;
  vehicle: Vehicle;
  route?: Route | null;
  team?: Team | null;
  trips?: Trip[];
  events?: AssignmentEventWithDetails[];
}

export interface TripWithDetails extends Trip {
  assignment: Assignment & {
    driver: Driver;
    vehicle: Vehicle;
    team?: Team | null;
    route?: Route | null;
  };
  assigned_route?: Route | null;
}

export interface AssignmentEventWithDetails extends AssignmentEvent {
  performer?: Profile | null;
  previous_driver?: Driver | null;
  new_driver?: Driver | null;
  previous_vehicle?: Vehicle | null;
  new_vehicle?: Vehicle | null;
}

export interface DriverReportItem {
  driverId: string;
  driverName: string;
  employeeCode: string;
  phone: string;
  assignedDutyDays: number;
  confirmedAssignments: number;
  vehiclesUsed: string[]; // registration numbers
  routesOperated: string[]; // route codes or names
  completedTripsCount: number;
  totalDistanceKm: number;
  hasMissingOdometerTrips: boolean;
}

export interface VehicleReportItem {
  vehicleId: string;
  registrationNumber: string;
  makeModel: string;
  vehicleType: string;
  currentOdometer: number;
  status: string;
  driversCount: number;
  driversUsed: string[];
  dutyDatesCount: number;
  routesOperated: string[];
  completedTripsCount: number;
  totalDistanceKm: number;
  maintenancePeriodsCount?: number;
}

export interface RouteReportItem {
  routeId: string;
  routeCode: string;
  routeName: string;
  origin: string;
  destination: string;
  clientName: string;
  completedTripsCount: number;
  distinctDriversCount: number;
  distinctVehiclesCount: number;
  totalDistanceKm: number;
}

export interface TeamReportItem {
  teamId: string;
  teamName: string;
  contactPerson: string | null;
  completedTripsCount: number;
  distinctVehiclesCount: number;
  distinctDriversCount: number;
  totalDistanceKm: number;
}

export interface DashboardMetrics {
  totalVehicles: number;
  activeVehicles: number;
  maintenanceVehicles: number;
  totalDrivers: number;
  activeDrivers: number;
  todayAssignmentsCount: number;
  pendingConfirmationsCount: number;
  activeTripsCount: number;
  completedTripsCount: number;
  cancelledDutiesCount: number;
}
