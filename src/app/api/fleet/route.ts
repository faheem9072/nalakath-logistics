import { NextRequest, NextResponse } from 'next/server';
import { fleetDb } from '@/lib/server/db';
import {
  syncDriverToFirestore,
  syncVehicleToFirestore,
  syncTripToFirestore,
  syncExpenseToFirestore,
} from '@/lib/firebase/sync';

export async function GET() {
  try {
    const data = fleetDb.getAllData();
    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error('API GET /api/fleet error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch fleet data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    switch (action) {
      // 1. Trips
      case 'startTrip': {
        const trip = fleetDb.startTrip(payload);
        syncTripToFirestore(trip).catch(() => {});
        return NextResponse.json({ success: true, trip });
      }
      case 'endTrip': {
        const result = fleetDb.endTrip(payload);
        if (result?.trip) syncTripToFirestore(result.trip).catch(() => {});
        return NextResponse.json({ success: true, ...result });
      }
      case 'updateTrip': {
        const trip = fleetDb.updateTrip(payload.id, payload.data);
        syncTripToFirestore(trip).catch(() => {});
        return NextResponse.json({ success: true, trip });
      }
      case 'addManualTrip': {
        const trip = fleetDb.addManualTrip(payload);
        syncTripToFirestore(trip).catch(() => {});
        return NextResponse.json({ success: true, trip });
      }
      case 'deleteTrip': {
        fleetDb.deleteTrip(payload.id);
        return NextResponse.json({ success: true });
      }

      // 2. Expenses
      case 'createExpense': {
        const expense = fleetDb.createExpense(payload);
        syncExpenseToFirestore(expense).catch(() => {});
        return NextResponse.json({ success: true, expense });
      }
      case 'updateExpense': {
        const expense = fleetDb.updateExpense(payload.id, payload.data);
        return NextResponse.json({ success: true, expense });
      }
      case 'deleteExpense': {
        fleetDb.deleteExpense(payload.id);
        return NextResponse.json({ success: true });
      }

      // 3. Drivers
      case 'createDriver': {
        const driver = fleetDb.createDriver(payload);
        syncDriverToFirestore(driver).catch(() => {});
        return NextResponse.json({ success: true, driver });
      }
      case 'updateDriver': {
        const driver = fleetDb.updateDriver(payload.id, payload.data);
        syncDriverToFirestore(driver).catch(() => {});
        return NextResponse.json({ success: true, driver });
      }
      case 'allowDriverOverride': {
        fleetDb.allowDriverOverride(payload.driverId);
        return NextResponse.json({ success: true });
      }
      case 'archiveDriver': {
        fleetDb.archiveDriver(payload.id);
        syncDriverToFirestore({ id: payload.id, is_active: false }).catch(() => {});
        return NextResponse.json({ success: true });
      }

      // 4. Vehicles
      case 'createVehicle': {
        const vehicle = fleetDb.createVehicle(payload);
        syncVehicleToFirestore(vehicle).catch(() => {});
        return NextResponse.json({ success: true, vehicle });
      }
      case 'updateVehicle': {
        const vehicle = fleetDb.updateVehicle(payload.id, payload.data);
        syncVehicleToFirestore(vehicle).catch(() => {});
        return NextResponse.json({ success: true, vehicle });
      }
      case 'archiveVehicle': {
        fleetDb.archiveVehicle(payload.id);
        syncVehicleToFirestore({ id: payload.id, is_active: false }).catch(() => {});
        return NextResponse.json({ success: true });
      }

      // 5. Companies
      case 'createCompany': {
        const company = fleetDb.createCompany(payload);
        return NextResponse.json({ success: true, company });
      }
      case 'updateCompany': {
        const company = fleetDb.updateCompany(payload.id, payload.data);
        return NextResponse.json({ success: true, company });
      }

      // 6. Incomes & Settings
      case 'setVehicleIncome': {
        const income = fleetDb.setVehicleIncome(payload.vehicleId, payload.month, payload.amount);
        return NextResponse.json({ success: true, income });
      }
      case 'updateSetting': {
        fleetDb.updateSetting(payload.key, payload.value);
        return NextResponse.json({ success: true });
      }

      // 7. Assignments & Duties
      case 'createAssignment': {
        const assignment = fleetDb.createAssignment(payload);
        return NextResponse.json({ success: true, assignment });
      }
      case 'updateAssignment': {
        const assignment = fleetDb.updateAssignment(payload.id, payload.data);
        return NextResponse.json({ success: true, assignment });
      }
      case 'reassignAssignment': {
        const assignment = fleetDb.reassignAssignment(payload);
        return NextResponse.json({ success: true, assignment });
      }
      case 'confirmDuty': {
        const assignment = fleetDb.confirmDuty(payload.assignmentId);
        return NextResponse.json({ success: true, assignment });
      }
      case 'assignDriverAdhocVehicle': {
        const assignment = fleetDb.assignDriverAdhocVehicle(
          payload.driverPhoneOrId,
          payload.vehicleId,
          payload.routeLocation
        );
        return NextResponse.json({ success: true, assignment });
      }

      // 8. Teams & Routes
      case 'createTeam': {
        const team = fleetDb.createTeam(payload);
        return NextResponse.json({ success: true, team });
      }
      case 'updateTeam': {
        const team = fleetDb.updateTeam(payload.id, payload.data);
        return NextResponse.json({ success: true, team });
      }
      case 'createRoute': {
        const route = fleetDb.createRoute(payload);
        return NextResponse.json({ success: true, route });
      }
      case 'updateRoute': {
        const route = fleetDb.updateRoute(payload.id, payload.data);
        return NextResponse.json({ success: true, route });
      }

      // 9. Maintenance
      case 'recordMaintenance': {
        const res = fleetDb.recordMaintenance(payload);
        return NextResponse.json(res);
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: unknown) {
    console.error('API POST /api/fleet error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 400 }
    );
  }
}
