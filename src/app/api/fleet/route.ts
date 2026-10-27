import { NextRequest, NextResponse } from 'next/server';
import {
  fetchFleetStateFromFirestore,
  startTripInFirestore,
  endTripInFirestore,
  updateTripInFirestore,
  addManualTripInFirestore,
  deleteTripInFirestore,
  createExpenseInFirestore,
  updateExpenseInFirestore,
  deleteExpenseInFirestore,
  createDriverInFirestore,
  updateDriverInFirestore,
  deleteDriverInFirestore,
  allowDriverOverrideInFirestore,
  createVehicleInFirestore,
  updateVehicleInFirestore,
  deleteVehicleInFirestore,
  createCompanyInFirestore,
  updateCompanyInFirestore,
  deleteCompanyInFirestore,
  getLinkedCountsFromFirestore,
  saveVehicleIncomeInFirestore,
  updateSettingInFirestore,
  recordMaintenanceInFirestore,
} from '@/lib/firebase/firestore-service';
import { fleetEvents } from '@/lib/server/events';


export async function GET() {
  try {
    // Firebase Firestore is the ONLY authoritative database
    const data = await fetchFleetStateFromFirestore();
    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error('API GET /api/fleet error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch fleet data from Firebase' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    let responsePayload: any;

    switch (action) {
      // 1. Trips
      case 'startTrip': {
        const trip = await startTripInFirestore(payload);
        responsePayload = { success: true, trip };
        break;
      }
      case 'endTrip': {
        const result = await endTripInFirestore(payload);
        responsePayload = { success: true, ...result };
        break;
      }
      case 'updateTrip': {
        const trip = await updateTripInFirestore(payload.id, payload.data);
        responsePayload = { success: true, trip };
        break;
      }
      case 'addManualTrip': {
        const trip = await addManualTripInFirestore(payload);
        responsePayload = { success: true, trip };
        break;
      }
      case 'deleteTrip': {
        const result = await deleteTripInFirestore(payload.id);
        responsePayload = result;
        break;
      }

      // 2. Expenses
      case 'createExpense': {
        const expense = await createExpenseInFirestore(payload);
        responsePayload = { success: true, expense };
        break;
      }
      case 'updateExpense': {
        const expense = await updateExpenseInFirestore(payload.id, payload.data);
        responsePayload = { success: true, expense };
        break;
      }
      case 'deleteExpense': {
        const result = await deleteExpenseInFirestore(payload.id);
        responsePayload = result;
        break;
      }

      // 3. Drivers
      case 'createDriver': {
        const driver = await createDriverInFirestore(payload);
        responsePayload = { success: true, driver };
        break;
      }
      case 'updateDriver': {
        const driver = await updateDriverInFirestore(payload.id, payload.data);
        responsePayload = { success: true, driver };
        break;
      }
      case 'allowDriverOverride': {
        await allowDriverOverrideInFirestore(payload.driverId, payload.enabled !== false);
        responsePayload = { success: true };
        break;
      }
      case 'archiveDriver':
      case 'deleteDriver': {
        const result = await deleteDriverInFirestore(payload.id);
        responsePayload = result;
        break;
      }

      // 4. Vehicles
      case 'createVehicle': {
        const vehicle = await createVehicleInFirestore(payload);
        responsePayload = { success: true, vehicle };
        break;
      }
      case 'updateVehicle': {
        const vehicle = await updateVehicleInFirestore(payload.id, payload.data);
        responsePayload = { success: true, vehicle };
        break;
      }
      case 'archiveVehicle':
      case 'deleteVehicle': {
        const result = await deleteVehicleInFirestore(payload.id);
        responsePayload = result;
        break;
      }

      // 5. Companies
      case 'createCompany': {
        const company = await createCompanyInFirestore(payload);
        responsePayload = { success: true, company };
        break;
      }
      case 'updateCompany': {
        const company = await updateCompanyInFirestore(payload.id, payload.data);
        responsePayload = { success: true, company };
        break;
      }
      case 'deleteCompany': {
        const result = await deleteCompanyInFirestore(payload.id);
        responsePayload = result;
        break;
      }
      case 'getLinkedCounts': {
        const counts = await getLinkedCountsFromFirestore(payload.type, payload.id);
        responsePayload = { success: true, ...counts };
        break;
      }

      // 6. Incomes & Settings
      case 'setVehicleIncome': {
        await saveVehicleIncomeInFirestore(payload.vehicleId, payload.month, payload.amount);
        responsePayload = { success: true };
        break;
      }
      case 'updateSetting': {
        await updateSettingInFirestore(payload.key, payload.value);
        responsePayload = { success: true };
        break;
      }

      // 7. Maintenance
      case 'recordMaintenance': {
        const res = await recordMaintenanceInFirestore(payload);
        responsePayload = res;
        break;
      }

      // Legacy stubs (assignments / teams / routes not used in demo, cleanly supported)
      case 'createAssignment':
      case 'updateAssignment':
      case 'reassignAssignment':
      case 'confirmDuty':
      case 'assignDriverAdhocVehicle':
      case 'createTeam':
      case 'updateTeam':
      case 'createRoute':
      case 'updateRoute': {
        responsePayload = { success: true };
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Notify connected SSE listeners across tabs/browsers
    try {
      fleetEvents.emit('change', { timestamp: Date.now(), action });
    } catch {}

    return NextResponse.json(responsePayload);
  } catch (err: unknown) {
    console.error('API POST /api/fleet error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 400 }
    );
  }
}
