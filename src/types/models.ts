import {
  Assignment,
  Trip,
  Driver,
  Vehicle,
  Route,
  Team,
  AssignmentEvent,
  Profile,
  Expense,
} from './database';

export interface ExpenseWithDetails extends Expense {
  vehicle?: Vehicle | null;
  driver?: Driver | null;
}

export interface VehicleMonthlyDriverStats {
  driverId: string;
  driverName: string;
  driverPhone: string;
  employeeCode: string;
  daysCount: number;
  tripsCount: number;
  totalKm: number;
  dates: string[];
}

export interface VehicleDetailReport {
  vehicle: Vehicle;
  selectedMonth: string; // YYYY-MM
  company: string;
  routeLocation: string;
  defaultDrivers: string;
  driversWhoDrove: VehicleMonthlyDriverStats[];
  totalDriversCount: number;
  totalDaysOperated: number;
  totalTripsCount: number;
  totalMonthKm: number;
  expenses: {
    totals: {
      fuel: number;
      fuelLitres: number;
      toll: number;
      maintenance: number;
      other: number;
      grandTotal: number;
    };
    entries: ExpenseWithDetails[];
  };
}


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

export interface DriverVehicleUsage {
  vehicleId: string;
  registrationNumber: string;
  makeModel: string;
  tripsCount: number;
  distanceKm: number;
  dutyDaysCount: number;
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
  totalDutyHours: number; // in hours, e.g. 78.5
  formattedDutyTime: string; // e.g. "78 hrs 30 mins"
  averageDailyHours: number; // e.g. 6.5
  vehicleBreakdown: DriverVehicleUsage[];
}

export interface VehicleReportItem {
  vehicleId: string;
  registrationNumber: string;
  makeModel: string;
  vehicleType: string;
  currentOdometer: number;
  status: string;
  company?: string;
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
