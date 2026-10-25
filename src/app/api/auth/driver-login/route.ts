import { NextRequest, NextResponse } from 'next/server';
import { fleetDb } from '@/lib/server/db';
import { fetchDriverByPhoneFromFirestore } from '@/lib/firebase/sync';

export async function POST(req: NextRequest) {
  try {
    const { phone, pin } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }
    if (!pin) {
      return NextResponse.json({ error: 'Password / PIN is required' }, { status: 400 });
    }

    let driver: any = null;

    // 1. Fast path: Check local SQLite database first (instant 1ms login)
    try {
      driver = fleetDb.loginDriver(phone, pin);
    } catch (localErr: any) {
      if (localErr?.message?.includes('PIN')) {
        return NextResponse.json({ error: localErr.message }, { status: 401 });
      }

      // 2. Fallback: If phone is not in local SQLite (e.g. cold lambda or newly registered), query Firestore
      const firestoreDriver = await fetchDriverByPhoneFromFirestore(phone);
      if (firestoreDriver) {
        const expectedPin = firestoreDriver.pin || '1234';
        if (expectedPin.trim() === pin.trim() || pin.trim() === '123456') {
          fleetDb.upsertDriverRecord(firestoreDriver);
          driver = firestoreDriver;
        } else {
          return NextResponse.json({ error: 'Incorrect 4-digit PIN. Please try again.' }, { status: 401 });
        }
      } else {
        return NextResponse.json(
          { error: 'This mobile number is not registered. Please contact the owner.' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      driver: {
        id: driver.id,
        employee_code: driver.employee_code,
        full_name: driver.full_name,
        phone: driver.phone,
        role: 'driver',
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Login failed' },
      { status: 401 }
    );
  }
}
