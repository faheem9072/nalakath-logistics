import { Assignment, Driver, Route, Team, Trip, Vehicle } from '@/types/database';
import {
  DriverReportItem,
  VehicleReportItem,
  RouteReportItem,
  TeamReportItem,
  DriverVehicleUsage,
} from '@/types/models';
import { calculateTripDistance } from './odometer-calculator';

export interface AggregateReportsInput {
  assignments: Assignment[];
  trips: Trip[];
  drivers: Driver[];
  vehicles: Vehicle[];
  routes: Route[];
  teams: Team[];
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

/**
 * Filter assignments by date range if provided
 */
function isDateInRange(date: string, startDate?: string, endDate?: string): boolean {
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

function getShiftDurationMinutes(start: string, end: string): number {
  const startM = parseTimeToMinutes(start);
  const endM = parseTimeToMinutes(end);
  if (endM >= startM) {
    return endM - startM;
  }
  return 24 * 60 - startM + endM;
}

export function aggregateDriverReport(input: AggregateReportsInput): DriverReportItem[] {
  const { assignments, trips, drivers, vehicles, routes, startDate, endDate } = input;

  const vehiclesMap = new Map(vehicles.map((v) => [v.id, v.registration_number]));
  const vehiclesObjMap = new Map(vehicles.map((v) => [v.id, v]));
  const routesMap = new Map(routes.map((r) => [r.id, r.code]));

  // Index trips by assignment_id
  const tripsByAssignment = new Map<string, Trip[]>();
  for (const t of trips) {
    const list = tripsByAssignment.get(t.assignment_id) || [];
    list.push(t);
    tripsByAssignment.set(t.assignment_id, list);
  }

  // Filter assignments within date range and not cancelled
  const filteredAssignments = assignments.filter((a) => {
    if (!isDateInRange(a.duty_date, startDate, endDate)) return false;
    if (a.status === 'cancelled' || a.status === 'reassigned') return false;
    return true;
  });

  // Group assignments by driver_id
  const assignmentsByDriver = new Map<string, Assignment[]>();
  for (const a of filteredAssignments) {
    const list = assignmentsByDriver.get(a.driver_id) || [];
    list.push(a);
    assignmentsByDriver.set(a.driver_id, list);
  }

  return drivers.map((driver) => {
    const driverAssignments = assignmentsByDriver.get(driver.id) || [];

    // 1. Count distinct duty dates and calculate duty shift hours
    const dutyDatesSet = new Set<string>();
    let confirmedCount = 0;
    const vehicleRegsSet = new Set<string>();
    const routeCodesSet = new Set<string>();
    let totalDutyMinutes = 0;

    const vehicleUsageMap = new Map<
      string,
      {
        vehicleId: string;
        registrationNumber: string;
        makeModel: string;
        tripsCount: number;
        distanceKm: number;
        dutyDates: Set<string>;
      }
    >();

    for (const a of driverAssignments) {
      dutyDatesSet.add(a.duty_date);

      if (a.driver_confirmed_at !== null || a.status !== 'scheduled') {
        confirmedCount++;
      }

      // Calculate shift duration in minutes
      const shiftM = getShiftDurationMinutes(a.planned_start_time, a.planned_end_time);
      totalDutyMinutes += shiftM;

      const vObj = vehiclesObjMap.get(a.vehicle_id);
      const vReg = vObj?.registration_number || vehiclesMap.get(a.vehicle_id);
      if (vReg) vehicleRegsSet.add(vReg);

      if (a.vehicle_id) {
        let vEntry = vehicleUsageMap.get(a.vehicle_id);
        if (!vEntry) {
          vEntry = {
            vehicleId: a.vehicle_id,
            registrationNumber: vReg || 'Unknown',
            makeModel: vObj?.make_model || '',
            tripsCount: 0,
            distanceKm: 0,
            dutyDates: new Set<string>(),
          };
          vehicleUsageMap.set(a.vehicle_id, vEntry);
        }
        vEntry.dutyDates.add(a.duty_date);
      }

      if (a.route_id) {
        const rCode = routesMap.get(a.route_id);
        if (rCode) routeCodesSet.add(rCode);
      }
    }

    // 2. Aggregate trips completed under these assignments
    let completedTrips = 0;
    let totalDistanceKm = 0;
    let hasMissingOdometerTrips = false;

    for (const a of driverAssignments) {
      const aTrips = tripsByAssignment.get(a.id) || [];
      for (const trip of aTrips) {
        if (trip.status === 'completed') {
          completedTrips++;

          if (trip.assigned_route_id) {
            const rCode = routesMap.get(trip.assigned_route_id);
            if (rCode) routeCodesSet.add(rCode);
          }

          let tripDistance = 0;
          const dist = calculateTripDistance(trip.start_odometer, trip.end_odometer);
          if (dist.hasValidPair && dist.distanceKm !== null) {
            totalDistanceKm += dist.distanceKm;
            tripDistance = dist.distanceKm;
          } else {
            hasMissingOdometerTrips = true;
          }

          const vEntry = vehicleUsageMap.get(a.vehicle_id);
          if (vEntry) {
            vEntry.tripsCount++;
            vEntry.distanceKm += tripDistance;
          }
        }
      }
    }

    const totalDutyHours = Number((totalDutyMinutes / 60).toFixed(1));
    const h = Math.floor(totalDutyMinutes / 60);
    const m = totalDutyMinutes % 60;
    const formattedDutyTime = `${h}h ${m > 0 ? `${m}m` : '0m'}`;
    const averageDailyHours =
      dutyDatesSet.size > 0 ? Number((totalDutyHours / dutyDatesSet.size).toFixed(1)) : 0;

    const vehicleBreakdown: DriverVehicleUsage[] = Array.from(vehicleUsageMap.values()).map(
      (v) => ({
        vehicleId: v.vehicleId,
        registrationNumber: v.registrationNumber,
        makeModel: v.makeModel,
        tripsCount: v.tripsCount,
        distanceKm: Number(v.distanceKm.toFixed(1)),
        dutyDaysCount: v.dutyDates.size,
      })
    );

    return {
      driverId: driver.id,
      driverName: driver.full_name,
      employeeCode: driver.employee_code,
      phone: driver.phone,
      assignedDutyDays: dutyDatesSet.size,
      confirmedAssignments: confirmedCount,
      vehiclesUsed: Array.from(vehicleRegsSet),
      routesOperated: Array.from(routeCodesSet),
      completedTripsCount: completedTrips,
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      hasMissingOdometerTrips,
      totalDutyHours,
      formattedDutyTime,
      averageDailyHours,
      vehicleBreakdown,
    };
  });
}

export function aggregateVehicleReport(input: AggregateReportsInput): VehicleReportItem[] {
  const { assignments, trips, drivers, vehicles, routes, startDate, endDate } = input;

  const driversMap = new Map(drivers.map((d) => [d.id, d.full_name]));
  const routesMap = new Map(routes.map((r) => [r.id, r.code]));

  const tripsByAssignment = new Map<string, Trip[]>();
  for (const t of trips) {
    const list = tripsByAssignment.get(t.assignment_id) || [];
    list.push(t);
    tripsByAssignment.set(t.assignment_id, list);
  }

  const filteredAssignments = assignments.filter((a) => {
    if (!isDateInRange(a.duty_date, startDate, endDate)) return false;
    if (a.status === 'cancelled' || a.status === 'reassigned') return false;
    return true;
  });

  const assignmentsByVehicle = new Map<string, Assignment[]>();
  for (const a of filteredAssignments) {
    const list = assignmentsByVehicle.get(a.vehicle_id) || [];
    list.push(a);
    assignmentsByVehicle.set(a.vehicle_id, list);
  }

  return vehicles.map((vehicle) => {
    const vAssignments = assignmentsByVehicle.get(vehicle.id) || [];

    const driverNamesSet = new Set<string>();
    const dutyDatesSet = new Set<string>();
    const routeCodesSet = new Set<string>();

    for (const a of vAssignments) {
      dutyDatesSet.add(a.duty_date);

      const dName = driversMap.get(a.driver_id);
      if (dName) driverNamesSet.add(dName);

      if (a.route_id) {
        const rCode = routesMap.get(a.route_id);
        if (rCode) routeCodesSet.add(rCode);
      }
    }

    let completedTrips = 0;
    let totalDistanceKm = 0;

    for (const a of vAssignments) {
      const aTrips = tripsByAssignment.get(a.id) || [];
      for (const trip of aTrips) {
        if (trip.status === 'completed') {
          completedTrips++;

          if (trip.assigned_route_id) {
            const rCode = routesMap.get(trip.assigned_route_id);
            if (rCode) routeCodesSet.add(rCode);
          }

          const dist = calculateTripDistance(trip.start_odometer, trip.end_odometer);
          if (dist.hasValidPair && dist.distanceKm !== null) {
            totalDistanceKm += dist.distanceKm;
          }
        }
      }
    }

    return {
      vehicleId: vehicle.id,
      registrationNumber: vehicle.registration_number,
      makeModel: vehicle.make_model,
      vehicleType: vehicle.vehicle_type,
      currentOdometer: vehicle.current_odometer,
      status: vehicle.status,
      company: vehicle.company || 'Delhivery',
      driversCount: driverNamesSet.size,
      driversUsed: Array.from(driverNamesSet),
      dutyDatesCount: dutyDatesSet.size,
      routesOperated: Array.from(routeCodesSet),
      completedTripsCount: completedTrips,
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      maintenancePeriodsCount: vehicle.status === 'maintenance' ? 1 : 0,
    };
  });
}

export function aggregateRouteReport(input: AggregateReportsInput): RouteReportItem[] {
  const { assignments, trips, routes, teams, startDate, endDate } = input;

  const teamsMap = new Map(teams.map((t) => [t.id, t.name]));

  const assignmentsMap = new Map(assignments.map((a) => [a.id, a]));

  const tripsByRoute = new Map<string, Trip[]>();
  for (const t of trips) {
    if (t.status !== 'completed') continue;
    const assignment = assignmentsMap.get(t.assignment_id);
    if (!assignment) continue;
    if (!isDateInRange(assignment.duty_date, startDate, endDate)) continue;

    const routeId = t.assigned_route_id || assignment.route_id;
    if (routeId) {
      const list = tripsByRoute.get(routeId) || [];
      list.push(t);
      tripsByRoute.set(routeId, list);
    }
  }

  return routes.map((route) => {
    const routeTrips = tripsByRoute.get(route.id) || [];
    const driversSet = new Set<string>();
    const vehiclesSet = new Set<string>();
    let totalDistanceKm = 0;

    for (const t of routeTrips) {
      const assignment = assignmentsMap.get(t.assignment_id);
      if (assignment) {
        driversSet.add(assignment.driver_id);
        vehiclesSet.add(assignment.vehicle_id);
      }

      const dist = calculateTripDistance(t.start_odometer, t.end_odometer);
      if (dist.hasValidPair && dist.distanceKm !== null) {
        totalDistanceKm += dist.distanceKm;
      }
    }

    return {
      routeId: route.id,
      routeCode: route.code,
      routeName: route.name,
      origin: route.origin,
      destination: route.destination,
      clientName: route.team_id ? teamsMap.get(route.team_id) || 'Internal' : 'General Service',
      completedTripsCount: routeTrips.length,
      distinctDriversCount: driversSet.size,
      distinctVehiclesCount: vehiclesSet.size,
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    };
  });
}

export function aggregateTeamReport(input: AggregateReportsInput): TeamReportItem[] {
  const { assignments, trips, teams, startDate, endDate } = input;

  const assignmentsMap = new Map(assignments.map((a) => [a.id, a]));

  const tripsByTeam = new Map<string, Trip[]>();
  for (const t of trips) {
    if (t.status !== 'completed') continue;
    const assignment = assignmentsMap.get(t.assignment_id);
    if (!assignment) continue;
    if (!isDateInRange(assignment.duty_date, startDate, endDate)) continue;

    if (assignment.team_id) {
      const list = tripsByTeam.get(assignment.team_id) || [];
      list.push(t);
      tripsByTeam.set(assignment.team_id, list);
    }
  }

  return teams.map((team) => {
    const teamTrips = tripsByTeam.get(team.id) || [];
    const driversSet = new Set<string>();
    const vehiclesSet = new Set<string>();
    let totalDistanceKm = 0;

    for (const t of teamTrips) {
      const assignment = assignmentsMap.get(t.assignment_id);
      if (assignment) {
        driversSet.add(assignment.driver_id);
        vehiclesSet.add(assignment.vehicle_id);
      }

      const dist = calculateTripDistance(t.start_odometer, t.end_odometer);
      if (dist.hasValidPair && dist.distanceKm !== null) {
        totalDistanceKm += dist.distanceKm;
      }
    }

    return {
      teamId: team.id,
      teamName: team.name,
      contactPerson: team.contact_person,
      completedTripsCount: teamTrips.length,
      distinctVehiclesCount: vehiclesSet.size,
      distinctDriversCount: driversSet.size,
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    };
  });
}
